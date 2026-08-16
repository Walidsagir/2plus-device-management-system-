/**
 * 2PT-DMS dashboard, scoped by role.
 *
 * RBAC comes from Users.is_organization:
 *   true  -> organization account: sees every device/employee of its organization
 *   false -> employee account: sees only the devices assigned to that employee
 *
 * Expected endpoints (the API must enforce the same scoping server-side):
 *   GET {API_BASE}/me           -> current Users row (+ organization_id, employee_id)
 *   GET {API_BASE}/devices      -> devices visible to the caller
 *   GET {API_BASE}/employees    -> employees of the caller's organization (org accounts only)
 *   GET {API_BASE}/organizations
 */
const API_BASE = "http://127.0.0.1:8000";

const state = {
  online: false,
  user: null,
  organizations: [],
  employees: [],
  devices: [],
};

const sample = {
  organizations: [
    { id: 1, organization_name: "Lagos Logistics Ltd", organization_registration: "RC-104882" },
    { id: 2, organization_name: "Kano Field Services", organization_registration: "RC-229471" },
  ],
  users: [
    {
      id: 1, first_name: "Walid", last_name: "Sagir", email: "walid@lagoslogistics.ng",
      phone_number: "+2348031112233", is_organization: true,
      organization_name: "Lagos Logistics Ltd", organization_registration: "RC-104882",
      organization_id: 1, employee_id: null,
    },
    {
      id: 2, first_name: "Amina", last_name: "Bello", email: "amina@lagoslogistics.ng",
      phone_number: "+2348031112233", is_organization: false,
      organization_name: null, organization_registration: null,
      organization_id: 1, employee_id: 1,
    },
  ],
  employees: [
    { id: 1, employee_name: "Amina Bello", employee_email: "amina@lagoslogistics.ng", employee_phone_number: "+2348031112233", organization_id: 1, number_of_assigned_devices: 2, location: "Apapa Hub", created_at: "2026-01-12T08:00:00+01:00" },
    { id: 2, employee_name: "Chidi Okafor", employee_email: "chidi@lagoslogistics.ng", employee_phone_number: "+2347065558899", organization_id: 1, number_of_assigned_devices: 1, location: "Ikeja Depot", created_at: "2026-02-04T08:00:00+01:00" },
    { id: 3, employee_name: "Fatima Yusuf", employee_email: "fatima@kanofield.ng", employee_phone_number: "+2349022004411", organization_id: 2, number_of_assigned_devices: 1, location: "Kano Warehouse", created_at: "2026-02-20T08:00:00+01:00" },
    { id: 4, employee_name: "Tunde Adeyemi", employee_email: "tunde@kanofield.ng", employee_phone_number: "+2348109887744", organization_id: 2, number_of_assigned_devices: 0, location: "Kano Warehouse", created_at: "2026-03-02T08:00:00+01:00" },
  ],
  devices: [
    {
      id: 1, device_name: "Field Scanner A1", device_type: "Scanner", manufacturer: "Zebra",
      organization_id: 1, employee_id: 1, imei1: "356938035643809", imei2: "356938035643810",
      owners_name: "Amina Bello", owners_phone_number: "+2348031112233", location: "Apapa Hub",
      active: true, new_license: true, reonboarding: false,
      under_maintenance: false, needs_repair: false, software_issue: false, hardware_issue: false,
      created_at: "2026-07-02T09:14:00+01:00",
    },
    {
      id: 2, device_name: "Dispatch Tablet 12", device_type: "Tablet", manufacturer: "Samsung",
      organization_id: 1, employee_id: 2, imei1: "490154203237518", imei2: null,
      owners_name: "Chidi Okafor", owners_phone_number: "+2347065558899", location: "Ikeja Depot",
      active: true, new_license: false, reonboarding: true,
      under_maintenance: true, needs_repair: true, software_issue: false, hardware_issue: true,
      created_at: "2026-05-21T16:40:00+01:00",
    },
    {
      id: 3, device_name: "Warehouse Phone 07", device_type: "Phone", manufacturer: "Tecno",
      organization_id: 2, employee_id: 3, imei1: "861234037777199", imei2: "861234037777200",
      owners_name: "Fatima Yusuf", owners_phone_number: "+2349022004411", location: "Kano Warehouse",
      active: false, new_license: false, reonboarding: false,
      under_maintenance: false, needs_repair: false, software_issue: true, hardware_issue: false,
      created_at: "2026-03-11T11:05:00+01:00",
    },
    {
      id: 4, device_name: "Route Scanner B4", device_type: "Scanner", manufacturer: "Honeywell",
      organization_id: 1, employee_id: 1, imei1: "356938035644111", imei2: null,
      owners_name: "Amina Bello", owners_phone_number: "+2348031112233", location: "Apapa Hub",
      active: true, new_license: false, reonboarding: false,
      under_maintenance: false, needs_repair: true, software_issue: false, hardware_issue: true,
      created_at: "2026-06-18T10:20:00+01:00",
    },
  ],
};

const $ = (sel) => document.querySelector(sel);
const isOrg = () => Boolean(state.user && state.user.is_organization);

document.addEventListener("DOMContentLoaded", init);

async function init() {
  await loadData();
  fillUserSwitch();
  render();
  wireEvents();
}

async function loadData() {
  try {
    const [me, devices, orgs] = await Promise.all([
      fetch(`${API_BASE}/me`, { credentials: "include" }).then(okJson),
      fetch(`${API_BASE}/devices`, { credentials: "include" }).then(okJson),
      fetch(`${API_BASE}/organizations`, { credentials: "include" }).then(okJson),
    ]);
    state.user = me;
    state.devices = devices;
    state.organizations = orgs;
    state.online = true;
    state.employees = me.is_organization
      ? await fetch(`${API_BASE}/employees`, { credentials: "include" }).then(okJson).catch(() => [])
      : [];
  } catch {
    state.online = false;
    state.organizations = sample.organizations;
    state.employees = sample.employees;
    setSampleUser(sample.users[0]);
  }
}

/** Offline demo only: applies the same scoping the API is expected to apply. */
function setSampleUser(user) {
  state.user = user;
  state.employees = user.is_organization
    ? sample.employees.filter((e) => e.organization_id === user.organization_id)
    : [];
  state.devices = user.is_organization
    ? sample.devices.filter((d) => d.organization_id === user.organization_id)
    : sample.devices.filter((d) => devicesBelongToEmployee(d, user));
}

function devicesBelongToEmployee(device, user) {
  if (device.employee_id != null && user.employee_id != null) return device.employee_id === user.employee_id;
  return device.owners_phone_number === user.phone_number;
}

function okJson(res) {
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function fillUserSwitch() {
  const select = $("#userSwitch");
  if (state.online) {
    select.hidden = true;
    return;
  }
  select.innerHTML = sample.users
    .map((u) => `<option value="${u.id}">${escapeHtml(`${u.first_name} ${u.last_name}`)} \u00b7 ${u.is_organization ? "Organization" : "Employee"}</option>`)
    .join("");
  select.value = String(state.user.id);
}

function render() {
  applyRoleVisibility();
  renderIdentity();
  renderKpis();
  renderStatusBreakdown();
  if (isOrg()) renderEmployees();
  else renderProfile();
  renderTypeBreakdown();
  renderLocationBreakdown();
  renderRecent();
  renderAttention();
}

function applyRoleVisibility() {
  const role = isOrg() ? "organization" : "employee";
  document.querySelectorAll("[data-role]").forEach((el) => {
    el.hidden = el.dataset.role !== role;
  });
}

function renderIdentity() {
  const u = state.user;
  const fullName = `${u.first_name} ${u.last_name}`;
  const org = organizationName(u.organization_id);

  $("#userAvatar").textContent = initials(fullName);
  $("#userName").textContent = fullName;
  $("#userRole").textContent = isOrg() ? "Organization admin" : "Employee";
  $("#breadcrumbScope").textContent = isOrg() ? "Organization overview" : "My devices";
  $("#pageTitle").textContent = isOrg() ? "Dashboard" : "My dashboard";
  $("#devicesMenuLabel").textContent = isOrg() ? "Devices" : "My devices";
  $("#manageLabel").textContent = isOrg() ? "Manage devices" : "View my devices";
  $("#recentTitle").textContent = isOrg() ? "Recently registered devices" : "My recent devices";

  const scope = isOrg() ? `${org} \u00b7 all devices and employees` : `Devices assigned to you at ${org}`;
  $("#pageSubtitle").textContent = state.online ? scope : `${scope} \u00b7 offline sample data`;
}

function organizationName(id) {
  const org = state.organizations.find((o) => o.id === Number(id));
  return org ? org.organization_name : "\u2014";
}

function count(predicate) {
  return state.devices.filter(predicate).length;
}

function renderKpis() {
  const cards = [
    { label: isOrg() ? "Total devices" : "My devices", value: state.devices.length, icon: "fa-mobile-alt", tone: "cyan", note: isOrg() ? "Registered to the organization" : "Assigned to you" },
    { label: "Active", value: count((x) => x.active), icon: "fa-check-circle", tone: "green", note: "Operational" },
    { label: "Inactive", value: count((x) => !x.active), icon: "fa-power-off", tone: "orange", note: "Not in service" },
    { label: "New license", value: count((x) => x.new_license), icon: "fa-star", tone: "cyan", note: "Pending onboarding" },
    { label: "Re-onboarding", value: count((x) => x.reonboarding), icon: "fa-sync", tone: "purple", note: "In progress" },
    { label: "Under maintenance", value: count((x) => x.under_maintenance), icon: "fa-tools", tone: "orange", note: "In repair/diagnosis" },
    { label: "Needs repair", value: count((x) => x.needs_repair), icon: "fa-exclamation-circle", tone: "orange", note: "Hardware issues open" },
  ];

  if (isOrg()) {
    cards.push({ label: "Employees", value: state.employees.length, icon: "fa-users", tone: "purple", note: "In this organization" });
  } else {
    cards.push({ label: "Software issues", value: count((x) => x.software_issue), icon: "fa-code", tone: "purple", note: "Reported on your devices" });
  }

  $("#kpiGrid").innerHTML = cards
    .map(
      (c) => `
      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-title">${c.label}</span>
          <div class="kpi-icon ${c.tone}"><i class="fas ${c.icon}"></i></div>
        </div>
        <div class="kpi-value">${c.value}</div>
        <div class="kpi-change">${c.note}</div>
      </div>`
    )
    .join("");
}

function renderStatusBreakdown() {
  const rows = [
    { label: "Active", value: count((x) => x.active), tone: "green" },
    { label: "Inactive", value: count((x) => !x.active), tone: "grey" },
    { label: "New license", value: count((x) => x.new_license), tone: "cyan" },
    { label: "Re-onboarding", value: count((x) => x.reonboarding), tone: "purple" },
    { label: "Under maintenance", value: count((x) => x.under_maintenance), tone: "orange" },
    { label: "Needs repair", value: count((x) => x.needs_repair), tone: "red" },
    { label: "Software issue", value: count((x) => x.software_issue), tone: "orange" },
  ];
  $("#statusBreakdown").innerHTML = barsHtml(rows, state.devices.length);
}

function renderTypeBreakdown() {
  const groups = groupBy(state.devices, (d) => d.device_type || "Unknown");
  const tones = ["cyan", "purple", "green", "orange", "red"];
  const rows = groups.map(([label, value], i) => ({ label, value, tone: tones[i % tones.length] }));
  $("#typeBreakdown").innerHTML = rows.length ? barsHtml(rows, state.devices.length) : `<p class="empty">No devices yet.</p>`;
}

function renderLocationBreakdown() {
  const groups = groupBy(state.devices, (d) => d.location || "Unassigned");
  const rows = groups.map(([label, value]) => ({ label, value, tone: "cyan" }));
  $("#locationBreakdown").innerHTML = rows.length ? barsHtml(rows, state.devices.length) : `<p class="empty">No devices yet.</p>`;
}

function groupBy(list, keyFn) {
  const map = new Map();
  list.forEach((item) => {
    const key = keyFn(item);
    map.set(key, (map.get(key) || 0) + 1);
  });
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

function barsHtml(rows, total) {
  return `<div class="bars">${rows
    .map((r) => {
      const pct = total ? Math.round((r.value / total) * 100) : 0;
      return `
        <div class="bar-row">
          <span class="bar-label">${escapeHtml(r.label)}</span>
          <div class="bar-track"><div class="bar-fill ${r.tone}" style="width:${pct}%"></div></div>
          <span class="bar-value">${r.value}</span>
        </div>`;
    })
    .join("")}</div>`;
}

function renderEmployees() {
  const employees = state.employees;
  const withDevices = employees.filter((e) => assignedCount(e) > 0).length;

  $("#employeeCount").textContent = `${employees.length} total`;
  $("#employeeStats").innerHTML = `
    <div class="mini-stat"><span class="mini-value green">${withDevices}</span><span class="mini-label">With devices</span></div>
    <div class="mini-stat"><span class="mini-value orange">${employees.length - withDevices}</span><span class="mini-label">No device</span></div>
    <div class="mini-stat"><span class="mini-value cyan">${new Set(employees.map((e) => e.location || "\u2014")).size}</span><span class="mini-label">Locations</span></div>`;

  if (!employees.length) {
    $("#employeeList").innerHTML = `<p class="empty">No employees yet.</p>`;
    return;
  }

  $("#employeeList").innerHTML = employees
    .slice(0, 6)
    .map((e) => {
      const devices = assignedCount(e);
      return `
        <li class="person">
          <div class="person-avatar">${escapeHtml(initials(e.employee_name))}</div>
          <div class="person-info">
            <p>${escapeHtml(e.employee_name)}</p>
            <span>${escapeHtml(e.employee_email)} \u00b7 ${escapeHtml(e.location || "No location")}</span>
          </div>
          <div class="person-meta">
            <span class="badge ${devices ? "cyan" : ""}">${devices} device${devices === 1 ? "" : "s"}</span>
            <span class="sub">${escapeHtml(e.employee_phone_number || "")}</span>
          </div>
        </li>`;
    })
    .join("");
}

/** Prefers live device rows over the denormalised Employee.number_of_assigned_devices counter. */
function assignedCount(employee) {
  const linked = state.devices.filter((d) => d.employee_id === employee.id).length;
  if (linked) return linked;
  const byPhone = state.devices.filter((d) => d.owners_phone_number === employee.employee_phone_number).length;
  return byPhone || employee.number_of_assigned_devices || 0;
}

function renderProfile() {
  const u = state.user;
  const devices = state.devices;
  const locations = new Set(devices.map((d) => d.location || "\u2014"));

  $("#profileStats").innerHTML = `
    <div class="mini-stat"><span class="mini-value cyan">${devices.length}</span><span class="mini-label">Assigned</span></div>
    <div class="mini-stat"><span class="mini-value green">${devices.filter((d) => d.active).length}</span><span class="mini-label">Active</span></div>
    <div class="mini-stat"><span class="mini-value orange">${devices.filter((d) => d.needs_repair || d.under_maintenance).length}</span><span class="mini-label">In repair</span></div>`;

  const rows = [
    ["Name", `${u.first_name} ${u.last_name}`],
    ["Email", u.email],
    ["Phone", u.phone_number],
    ["Organization", organizationName(u.organization_id)],
    ["Locations", [...locations].join(", ") || "\u2014"],
  ];

  $("#profileDetails").innerHTML = rows
    .map(
      ([label, value]) => `
      <li class="person">
        <div class="person-info">
          <span>${escapeHtml(label)}</span>
          <p>${escapeHtml(value)}</p>
        </div>
      </li>`
    )
    .join("");
}

function renderRecent() {
  const rows = [...state.devices]
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    .slice(0, 5);

  $("#recentEmpty").hidden = rows.length > 0;
  $("#recentTable tbody").innerHTML = rows
    .map(
      (d) => `
      <tr>
        <td>
          <div class="device-name">${escapeHtml(d.device_name)}</div>
          <div class="sub">${escapeHtml(d.device_type)} \u00b7 ${escapeHtml(d.manufacturer)}</div>
        </td>
        ${isOrg() ? `<td>${escapeHtml(d.owners_name)}<div class="sub">${escapeHtml(d.owners_phone_number)}</div></td>` : ""}
        <td class="mono">${escapeHtml(d.imei1)}</td>
        <td>${escapeHtml(d.location || "\u2014")}</td>
        <td><div class="badges">${statusBadges(d)}</div></td>
        <td>${formatDate(d.created_at)}</td>
      </tr>`
    )
    .join("");
}

function renderAttention() {
  const items = [];
  state.devices.forEach((d) => {
    if (d.needs_repair) items.push({ device: d, tone: "red", icon: "fa-screwdriver-wrench", text: "Needs repair" });
    if (d.under_maintenance) items.push({ device: d, tone: "orange", icon: "fa-tools", text: "Under maintenance" });
    if (d.software_issue) items.push({ device: d, tone: "orange", icon: "fa-code", text: "Software issue" });
    if (d.reonboarding) items.push({ device: d, tone: "purple", icon: "fa-sync", text: "Re-onboarding in progress" });
  });

  $("#attentionCount").textContent = `${items.length} open`;
  $("#attentionEmpty").hidden = items.length > 0;
  $("#attentionList").innerHTML = items
    .map(
      (i) => `
      <li class="alert-item ${i.tone}">
        <i class="fas ${i.icon}"></i>
        <div>
          <p>${escapeHtml(i.device.device_name)}</p>
          <span>${escapeHtml(i.text)} \u00b7 ${escapeHtml(i.device.location || organizationName(i.device.organization_id))}</span>
        </div>
        <a class="card-action" href="index.html">Open</a>
      </li>`
    )
    .join("");
}

function statusBadges(d) {
  const badges = [d.active ? `<span class="badge green">Active</span>` : `<span class="badge">Inactive</span>`];
  if (d.under_maintenance) badges.push(`<span class="badge orange">Maintenance</span>`);
  if (d.needs_repair) badges.push(`<span class="badge red">Needs repair</span>`);
  if (d.software_issue) badges.push(`<span class="badge orange">Software</span>`);
  if (d.new_license) badges.push(`<span class="badge cyan">New license</span>`);
  if (d.reonboarding) badges.push(`<span class="badge purple">Re-onboarding</span>`);
  return badges.join("");
}

function initials(name) {
  return String(name || "?")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || "")
    .join("")
    .toUpperCase();
}

function formatDate(value) {
  if (!value) return "\u2014";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "\u2014";
  return date.toLocaleDateString("en-NG", { year: "numeric", month: "short", day: "2-digit" });
}

function wireEvents() {
  $("#headerSearch").addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const q = e.target.value.trim();
    if (q) window.location.href = `index.html?q=${encodeURIComponent(q)}`;
  });

  $("#userSwitch").addEventListener("change", (e) => {
    const user = sample.users.find((u) => u.id === Number(e.target.value));
    if (!user) return;
    setSampleUser(user);
    render();
  });
}

function toggleSidebar() {
  $("#sidebar").classList.toggle("open");
}

function toggleSubmenu(element) {
  const submenu = element.nextElementSibling;
  if (submenu && submenu.classList.contains("submenu")) {
    submenu.classList.toggle("show");
    const chevron = element.querySelector("i.fa-chevron-down");
    if (chevron) chevron.style.transform = submenu.classList.contains("show") ? "rotate(180deg)" : "rotate(0)";
  }
  return false;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}
