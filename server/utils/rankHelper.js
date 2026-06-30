function getRank(value) {
    const order = ['02','03','04','05','06','07','08','09','10','J','Q','K','A'];
    return order.indexOf(value);
}

module.exports = { getRank };