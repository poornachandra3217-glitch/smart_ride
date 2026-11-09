import { routes, plans, money, today, status, book } from './model.mjs';

const storageKey = 'smart-ride-demo-v1';
const initial = { terms: [], attendance: {}, tickets: [] };
function load() {
  try {
    return JSON.parse(localStorage.getItem(storageKey)) || structuredClone(initial);
  } catch {
    return structuredClone(initial);
  }
}
let state = load();
let view = 'rider';
let routeId = routes[0].id;
let planId = plans[0].id;
let start = today();
const panel = document.querySelector('#panel');
const message = document.querySelector('#message');
const escape = text => String(text).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const option = (id, label, selected) => `<option value="${escape(id)}" ${id === selected ? 'selected' : ''}>${escape(label)}</option>`;
function flash(text, error = false) {
  message.textContent = text;
  message.classList.toggle('error', error);
}
function save(next, text) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(next));
  } catch {
    flash('Browser storage is unavailable. No changes were saved.', true);
    return;
  }
  state = next;
  render();
  flash(text);
}
function routeDetails(route) {
  return `<p><strong>${route.pickup}</strong> to <strong>${route.drop}</strong></p>
    <p>Pickup ${route.outbound} · Return ${route.return} · Monday to Friday</p>
    <p class="muted">${route.driver} · ${route.vehicle}</p>`;
}
function rider() {
  const route = routes.find(item => item.id === routeId);
  const plan = plans.find(item => item.id === planId);
  return `<div class="grid"><div><section class="card"><h2>Choose your commute</h2>
    <form id="checkout"><label class="field">Fixed route<select name="route">${routes.map(r => option(r.id, r.name, routeId)).join('')}</select></label>
    ${routeDetails(route)}
    <label class="field">Subscription<select name="plan">${plans.map(p => option(p.id, p.name + ' · ' + money(p.amount), planId)).join('')}</select></label>
    <label class="field">Start date<input type="date" name="start" value="${escape(start)}" min="${today()}" required></label>
    <button class="primary" type="submit">Simulate payment · ${money(plan.amount)}</button>
    <p class="muted">Demo checkout. No payment or card information is collected.</p></form></section></div>
    <div><section class="card"><h2>My subscriptions</h2>${state.terms.length ? state.terms.map(term => {
      const route = routes.find(item => item.id === term.routeId);
      const plan = plans.find(item => item.id === term.planId);
      const current = status(term, today());
      return `<div class="term"><span class="pill">${current}</span><h3>${route.name}</h3>
        <p>${plan.name} · ${term.start} to ${term.end} (end date excluded)</p>${routeDetails(route)}
        <div class="actions"><button data-action="receipt" data-id="${escape(term.id)}">Download receipt</button>
        ${current === 'Active' || current === 'Scheduled' ? `<button data-action="renew" data-id="${escape(term.id)}">Renew</button>
        <button data-action="cancel" data-id="${escape(term.id)}">Cancel demo term</button>` : ''}</div></div>`;
    }).join('') : '<p class="muted">Your confirmed subscriptions will appear here.</p>'}</section>
    <section class="card"><h2>Contact support</h2><form id="support"><label class="field">Sample issue<textarea name="issue" rows="2" required maxlength="240" placeholder="Use sample text only"></textarea></label><button>Submit demo ticket</button></form></section></div></div>`;
}
function driver() {
  const date = today();
  const weekday = new Date(date + 'T12:00:00+05:30').getUTCDay();
  const manifest = state.terms.filter(term => status(term, date) === 'Active' && weekday > 0 && weekday < 6);
  return `<div class="grid"><section class="card"><h2>Fixed route assignments</h2>${routes.map(r => `<div class="term"><h3>${r.name}</h3>${routeDetails(r)}</div>`).join('')}</section>
    <section class="card"><h2>Today's attendance</h2><p class="muted">${date} · Chennai · Sample driver workspace</p>
    ${manifest.length ? manifest.map(term => `<div class="term"><p>Demo commuter · ${routes.find(route => route.id === term.routeId).name}</p>${['Outbound','Return'].map(leg => {
      const key = date + '/' + term.id + '/' + leg;
      return `<label class="field">${leg}<select data-attendance="${escape(key)}">${['Unmarked','Boarded','Absent','Excused'].map(value => option(value, value, state.attendance[key] || 'Unmarked')).join('')}</select></label>`;
    }).join('')}</div>`).join('') : '<p>No active demo riders on today’s weekday runs.</p>'}<h3>Sample payout</h3><p>₹0 settled · No real payouts in the demo.</p></section></div>`;
}
function admin() {
  const active = state.terms.filter(term => status(term, today()) === 'Active');
  const open = state.tickets.filter(ticket => !ticket.resolved);
  return `<section class="card"><h2>Chennai operations</h2><div class="metrics">
    <p><strong>${active.length}</strong>Active subscriptions</p>
    <p><strong>${money(active.reduce((sum, term) => sum + term.amount / term.months, 0))}</strong>Demo monthly revenue</p>
    <p><strong>${routes.length}</strong>Fixed routes</p><p><strong>${open.length}</strong>Open tickets</p></div></section>
    <div class="grid"><section class="card"><h2>Route and vehicle roster</h2>${routes.map(r => `<div class="term"><h3>${r.name}</h3>${routeDetails(r)}</div>`).join('')}</section>
    <section class="card"><h2>Support queue</h2>${state.tickets.length ? state.tickets.map(ticket => `<div class="term"><p>${escape(ticket.issue)}</p>
    ${ticket.resolved ? '<span class="pill">Resolved</span>' : `<button data-action="resolve" data-id="${escape(ticket.id)}">Resolve ticket</button>`}</div>`).join('') : '<p>No demo tickets yet.</p>'}</section></div>`;
}
function render() {
  for (const button of document.querySelectorAll('[data-view]')) button.setAttribute('aria-pressed', String(button.dataset.view === view));
  panel.innerHTML = ({ rider, driver, admin })[view]();
}
document.querySelector('nav').addEventListener('click', event => {
  const target = event.target.closest('[data-view]');
  if (!target) return;
  view = target.dataset.view;
  flash('');
  render();
});
panel.addEventListener('change', event => {
  const field = event.target;
  if (field.name === 'route' || field.name === 'plan') {
    if (field.name === 'route') routeId = field.value;
    else planId = field.value;
    render();
    panel.querySelector('[name=' + field.name + ']').focus();
  } else if (field.name === 'start') {
    start = field.value;
  } else if (field.dataset.attendance) {
    const key = field.dataset.attendance;
    save({ ...state, attendance: { ...state.attendance, [key]: field.value } }, 'Demo attendance saved.');
    [...panel.querySelectorAll('[data-attendance]')].find(select => select.dataset.attendance === key)?.focus();
  }
});
panel.addEventListener('submit', event => {
  event.preventDefault();
  const form = event.target;
  const data = new FormData(form);
  if (form.id === 'checkout') {
    try {
      const term = book(state.terms, { routeId: data.get('route'), planId: data.get('plan'), start: data.get('start'), id: crypto.randomUUID(), date: today() });
      save({ ...state, terms: [term, ...state.terms] }, 'Simulated payment confirmed. Your subscription and receipt are ready.');
    } catch (error) {
      flash(error.message, true);
    }
  } else if (form.id === 'support') {
    const issue = data.get('issue').trim();
    if (!issue) return flash('Enter a sample issue first.', true);
    save({ ...state, tickets: [{ id: crypto.randomUUID(), issue, resolved: false }, ...state.tickets] }, 'Demo ticket created.');
  }
});
panel.addEventListener('click', event => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const { action, id } = button.dataset;
  if (action === 'resolve') {
    save({ ...state, tickets: state.tickets.map(ticket => ticket.id === id ? { ...ticket, resolved: true } : ticket) }, 'Demo ticket resolved.');
    return;
  }
  const term = state.terms.find(item => item.id === id);
  if (!term) return;
  if (action === 'cancel') {
    save({ ...state, terms: state.terms.map(item => item.id === id ? { ...item, cancelledOn: today() } : item) }, 'Demo subscription cancelled.');
  } else if (action === 'renew') {
    routeId = term.routeId;
    planId = term.planId;
    start = term.end;
    render();
    panel.querySelector('[name=start]').focus();
    flash('Renewal details loaded. Review the start date and simulate payment.');
  } else {
    const receipt = new Blob([`SMART RIDE DEMO RECEIPT\nReference: ${term.id}\nPurchased: ${term.purchasedOn}\nService: ${term.start} to ${term.end} (exclusive)\nAmount: ${money(term.amount)}\nSimulated payment. No money collected.\n`], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(receipt);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'smart-ride-demo-receipt.txt';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
});
window.addEventListener('storage', event => {
  if (event.key === storageKey || event.key === null) {
    state = load();
    render();
  }
});
render();
