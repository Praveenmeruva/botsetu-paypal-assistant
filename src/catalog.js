// Sample businesses. Prices are in the sandbox charge currency (CURRENCY env, default USD).
module.exports = {
  'sunrise-clinic': {
    name: 'Sunrise Family Clinic, Hyderabad', kind: 'clinic',
    services: [
      { id: 'gp', name: 'General physician consultation', price: 6 },
      { id: 'peds', name: 'Paediatrician consultation', price: 8 },
      { id: 'bp', name: 'BP + sugar check', price: 3 },
    ],
    slots: ['10:00', '11:00', '12:00', '16:00', '17:00', '18:00'],
  },
  'vidya-coaching': {
    name: 'Vidya Coaching Centre, Vijayawada', kind: 'coaching',
    services: [
      { id: 'maths10', name: 'Class 10 Maths – monthly fee', price: 15 },
      { id: 'eamcet', name: 'EAMCET crash course – registration', price: 25 },
      { id: 'trial', name: 'Trial class', price: 1 },
    ],
    slots: ['07:00', '17:30', '19:00'],
  },
};
