export const routes = [
  { id: 'omr', name: 'Velachery → Taramani', pickup: 'Velachery MRTS', drop: 'Tidel Park', outbound: '08:10', return: '18:15', driver: 'Arun Kumar', vehicle: 'Demo vehicle A · 6 seats', capacity: 6 },
  { id: 'guindy', name: 'Adyar → Guindy', pickup: 'Adyar Depot', drop: 'Guindy Metro', outbound: '08:30', return: '18:30', driver: 'Priya Raman', vehicle: 'Demo vehicle B · 4 seats', capacity: 4 },
];
export const plans = [
  { id: 'monthly', name: 'Monthly', months: 1, amount: 2999 },
  { id: 'quarterly', name: 'Quarterly', months: 3, amount: 8499 },
  { id: 'yearly', name: 'Yearly', months: 12, amount: 31999 },
];
export const money = amount => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
export const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
export function addMonths(date, months) {
  const [year, month, day] = date.split('-').map(Number);
  const end = new Date(Date.UTC(year, month - 1 + months, 1));
  const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)).getUTCDate();
  end.setUTCDate(Math.min(last, day));
  return end.toISOString().slice(0, 10);
}
export function status(term, date) {
  if (term.cancelledOn && date >= term.cancelledOn) return 'Cancelled';
  if (date >= term.end) return 'Expired';
  return date < term.start ? 'Scheduled' : 'Active';
}
export function book(terms, { routeId, planId, start, id, date }) {
  const route = routes.find(item => item.id === routeId);
  const plan = plans.find(item => item.id === planId);
  const parsed = new Date(start + 'T00:00:00Z');
  if (!route || !plan || !/^\d{4}-\d\d-\d\d$/.test(start) || Number.isNaN(+parsed) || parsed.toISOString().slice(0, 10) !== start || start < date || start > addMonths(date, 12)) {
    throw new Error('Choose an available route, plan and start date within the next year.');
  }
  const end = addMonths(start, plan.months);
  if (terms.some(term => start < (term.cancelledOn || term.end) && term.start < end && (!term.cancelledOn || term.cancelledOn > term.start))) {
    throw new Error('You already have a subscription covering part of these dates.');
  }
  return { id, routeId, planId, start, end, amount: plan.amount, months: plan.months, purchasedOn: date };
}
