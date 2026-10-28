// Tiny in-memory store (swap for a DB in production).
const crypto = require('crypto');
const bookings = new Map(); // id -> booking
const byOrder = new Map();  // paypal order id -> booking id
const sessions = new Map(); // session id -> { business, history, lang }

function newBooking(data) {
  const id = 'BK' + crypto.randomBytes(3).toString('hex').toUpperCase();
  const b = { id, status: 'PENDING_PAYMENT', createdAt: new Date().toISOString(), ...data };
  bookings.set(id, b);
  return b;
}
module.exports = { bookings, byOrder, sessions, newBooking };
