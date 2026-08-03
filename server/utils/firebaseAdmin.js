const crypto = require('crypto');
const https = require('https');

let cachedKeys = null;
let keysExpiry = 0;

/**
 * Fetch JSON utility using Node's native https module.
 * Eliminates the dependency on third-party libraries like axios.
 */
function fetchGoogleCertificates(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode !== 200) {
                reject(new Error(`Request failed with status code ${res.statusCode}`));
                return;
            }

            // Parse Cache-Control to find max-age
            const cacheControl = res.headers['cache-control'] || '';
            const match = cacheControl.match(/max-age=(\d+)/);
            const maxAgeSeconds = match ? parseInt(match[1], 10) : 3600;

            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    resolve({
                        data: JSON.parse(data),
                        maxAgeSeconds
                    });
                } catch (err) {
                    reject(new Error(`Failed to parse certificates: ${err.message}`));
                }
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

/**
 * Fetch Google's public certificates for Firebase ID tokens.
 * Caches them in-memory according to Cache-Control header instructions.
 */
async function getGooglePublicKeys() {
    const now = Date.now();
    if (cachedKeys && now < keysExpiry) {
        return cachedKeys;
    }

    try {
        const url = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
        const res = await fetchGoogleCertificates(url);
        
        cachedKeys = res.data;
        keysExpiry = now + (res.maxAgeSeconds * 1000);
        return cachedKeys;
    } catch (err) {
        console.error('❌ Failed to fetch Google public keys:', err.message);
        throw new Error(`Failed to retrieve Google public keys: ${err.message}`);
    }
}

/**
 * Verify a Firebase ID token locally without importing the Firebase Admin SDK or Axios.
 * Completely immune to CommonJS/ESM library conflicts (e.g., jwks-rsa/jose requiring ESM)
 * and does not require Google Cloud credentials or service account files.
 */
async function verifyFirebaseToken(idToken) {
    try {
        if (!idToken || typeof idToken !== 'string') {
            throw new Error('Token must be a non-empty string');
        }

        const parts = idToken.split('.');
        if (parts.length !== 3) {
            throw new Error('Invalid JWT format (must have 3 parts)');
        }

        const [headerB64, payloadB64, signatureB64] = parts;
        
        // Decode header & payload
        const header = JSON.parse(Buffer.from(headerB64, 'base64').toString('utf8'));
        const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString('utf8'));

        // 1. Verify headers
        if (header.alg !== 'RS256') {
            throw new Error(`Unsupported algorithm: ${header.alg} (expected RS256)`);
        }
        
        const kid = header.kid;
        if (!kid) {
            throw new Error('Missing "kid" header claim');
        }

        // 2. Fetch public certificates matching the key ID (kid)
        const publicKeys = await getGooglePublicKeys();
        const cert = publicKeys[kid];
        if (!cert) {
            throw new Error(`Google public key not found for kid: ${kid}`);
        }

        // 3. Verify signature using Node's crypto library
        const verify = crypto.createVerify('RSA-SHA256');
        verify.update(`${headerB64}.${payloadB64}`);
        
        // Firebase ID tokens are base64url encoded. Normalize to standard base64 for node's crypto.
        const signatureBuffer = Buffer.from(
            signatureB64.replace(/-/g, '+').replace(/_/g, '/'), 
            'base64'
        );
        
        const isSignatureValid = verify.verify(cert, signatureBuffer);
        if (!isSignatureValid) {
            throw new Error('Cryptographic signature verification failed');
        }

        // 4. Verify standard claims
        const now = Math.floor(Date.now() / 1000);
        const projectId = process.env.FIREBASE_PROJECT_ID || 'court-piece-66ef2';

        if (payload.iss !== `https://securetoken.google.com/${projectId}`) {
            throw new Error(`Invalid issuer: ${payload.iss}`);
        }

        if (payload.aud !== projectId) {
            throw new Error(`Invalid audience: ${payload.aud}`);
        }

        if (payload.exp < now) {
            throw new Error('Token has expired');
        }

        return {
            localId:     payload.sub, // The subject claim "sub" is the user's Firebase UID
            displayName: payload.name || '',
            email:       payload.email || '',
            photoUrl:    payload.picture || ''
        };
    } catch (err) {
        console.error('❌ verifyFirebaseToken failed:', err.message);
        throw new Error(`Firebase token verification failed: ${err.message}`);
    }
}

module.exports = { verifyFirebaseToken };
