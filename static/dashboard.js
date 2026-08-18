let me = null;
let stats = null;
let devices = [];
let tickets = [];
let agents = [];
let components = {};

const NAV = {
    organization: [
        { id: "dashboard", label: "Dashboard", icon: "fa-gauge-high" },
        { id: "devices", label: "All devices", icon: "fa-mobile-screen" },
        { id: "agents", label: "Agents", icon: "fa-users" },
        { id: "tickets", label: "Tickets", icon: "fa-ticket" },
        { id: "profile", label: "Profile", icon: "fa-user" },
    ],
    agent: [
        { id: "dashboard", label: "Dashboard", icon: "fa-gauge-high" },
        { id: "devices", label: "My devices", icon: "fa-mobile-screen" },
        { id: "create-ticket", label: "Create ticket", icon: "fa-circle-plus" },
        { id: "tickets", label: "My tickets", icon: "fa-ticket" },
        { id: "profile", label: "Profile", icon: "fa-user" },
    ],
};

function isOrg() {
    return me && me.is_organization;
}

async function api(path, options) {
    const res = await fetch(path, options);
    if (res.status === 401) {
        window.location.href = "/";
        throw new Error("unauthorized");
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || "Request failed");
    return data;
}

async function load() {
    try {
        me = await api("/me");
    } catch (err) {
        return;
    }

    try {
        stats = await api("/api/dashboard");
    } catch (err) {
        toast(err.message, "error");
        stats = {};
    }

    const requests = [api("/devices"), api("/tickets")];
    if (isOrg()) requests.push(api("/agents"));
    else requests.push(api("/ticket-components"));

    const [d, t, extra] = await Promise.all(requests.map((p) => p.catch(() => [])));
    devices = d || [];
    tickets = t || [];
    if (isOrg()) agents = extra || [];
    else components = extra || {};

    renderChrome();
    renderNav();
    show("dashboard");
}

function renderChrome() {
    const name = isOrg() ? stats.admin : stats.name;
    const org = isOrg() ? stats.organization : stats.my_organization;
    document.getElementById("brand-role").textContent = isOrg() ? "Organization admin" : "Agent";
    document.getElementById("user-name").textContent = name || `${me.first_name} ${me.last_name}`;
    document.getElementById("user-org").textContent = org || "No organization";
    document.getElementById("avatar").textContent = (me.first_name[0] + me.last_name[0]).toUpperCase();
    document.getElementById("devices-title").textContent = isOrg() ? "All devices" : "My devices";
    document.getElementById("tickets-title").textContent = isOrg() ? "Organization tickets" : "My tickets";
}

function renderNav() {
    const nav = document.getElementById("nav");
    nav.innerHTML = "";
    (isOrg() ? NAV.organization : NAV.agent).forEach((item) => {
        const button = document.createElement("button");
        button.id = `nav-${item.id}`;
        button.innerHTML = `<i class="fa-solid ${item.icon}"></i> ${item.label}`;
        button.onclick = () => show(item.id);
        nav.appendChild(button);
    });
}

function show(view) {
    document.querySelectorAll(".view").forEach((section) => section.classList.add("hidden"));
    document.getElementById(`view-${view}`).classList.remove("hidden");
    document.querySelectorAll(".nav button").forEach((b) => b.classList.remove("active"));
    const active = document.getElementById(`nav-${view}`);
    if (active) active.classList.add("active");

    const titles = {
        dashboard: isOrg() ? "Organization dashboard" : "My dashboard",
        devices: isOrg() ? "All devices" : "My devices",
        agents: "Agents",
        tickets: isOrg() ? "Tickets" : "My tickets",
        "create-ticket": "Create ticket",
        profile: "Profile",
    };
    document.getElementById("page-title").textContent = titles[view];
    document.getElementById("page-sub").textContent = isOrg()
        ? `${stats.organization || ""} · ${stats.total_devices || 0} devices · ${stats.agents || 0} agents`
        : `${stats.my_organization || "No organization"} · ${stats.my_devices || 0} assigned devices`;

    if (view === "dashboard") renderDashboard();
    if (view === "devices") renderDevices();
    if (view === "tickets") renderTickets();
    if (view === "agents") renderAgents();
    if (view === "create-ticket") renderTicketForm();
    if (view === "profile") renderProfile();
}

function kpi(label, value, icon, tone) {
    return `<div class="kpi ${tone || ""}">
        <div><div class="kpi-label">${label}</div><div class="kpi-value">${value ?? 0}</div></div>
        <div class="kpi-icon"><i class="fa-solid ${icon}"></i></div>
    </div>`;
}

function renderDashboard() {
    const grid = document.getElementById("kpi-grid");
    const panels = document.getElementById("panel-grid");

    if (isOrg()) {
        grid.innerHTML = [
            kpi("Total devices", stats.total_devices, "fa-mobile-screen"),
            kpi("Fully operational", stats.active_devices, "fa-circle-check", "green"),
            kpi("Partially operational", stats.partial_devices, "fa-circle-half-stroke", "amber"),
            kpi("New licenses", stats.new_license_devices, "fa-certificate", "purple"),
            kpi("Re-onboarding", stats.reonboarding_devices, "fa-rotate", "cyan"),
            kpi("Under maintenance", stats.devices_under_maintenance, "fa-screwdriver-wrench", "amber"),
            kpi("Agents", stats.agents, "fa-users", "purple"),
            kpi("Open tickets", stats.open_issues, "fa-ticket", "red"),
        ].join("");

        panels.innerHTML = `
            <div class="card">
                <div class="card-head"><h2>Issues by category</h2></div>
                ${statRow("Hardware", stats.hardware_issues)}
                ${statRow("Software", stats.software_issues)}
                ${statRow("License", stats.license_issues)}
            </div>
            <div class="card">
                <div class="card-head"><h2>Needs attention</h2></div>
                ${statRow("Critical (open)", stats.critical_attention)}
                ${statRow("High (open)", stats.high_attention)}
                ${statRow("Resolved tickets", stats.resolved_issues)}
            </div>
            <div class="card">
                <div class="card-head"><h2>Organization</h2><button class="link" onclick="show('agents')">View agents</button></div>
                ${statRow("Name", stats.organization || "—")}
                ${statRow("Registration", stats.organization_registration || "—")}
                ${statRow("Administrator", stats.admin || "—")}
            </div>`;
        return;
    }

    grid.innerHTML = [
        kpi("My devices", stats.my_devices, "fa-mobile-screen"),
        kpi("Fully operational", stats.my_active_devices, "fa-circle-check", "green"),
        kpi("Under maintenance", stats.my_devices_under_maintenance, "fa-screwdriver-wrench", "amber"),
        kpi("New licenses", stats.my_new_license_devices, "fa-certificate", "purple"),
        kpi("Open tickets", stats.my_open_tickets, "fa-ticket", "red"),
        kpi("Resolved tickets", stats.my_resolved_tickets, "fa-circle-check", "green"),
        kpi("Total enrollments", stats.my_total_enrollments, "fa-chart-line", "cyan"),
    ].join("");

    panels.innerHTML = `
        <div class="card">
            <div class="card-head"><h2>Raise a ticket</h2></div>
            <p class="muted small">Report a hardware, software or license fault on a device assigned to you.</p>
            <br><button class="primary" onclick="show('create-ticket')"><i class="fa-solid fa-circle-plus"></i> Create ticket</button>
        </div>
        <div class="card">
            <div class="card-head"><h2>My latest tickets</h2><button class="link" onclick="show('tickets')">View all</button></div>
            ${tickets.slice(0, 5).map((t) => statRow(`#${t.id} ${t.title}`, badge(t.status))).join("") || '<div class="empty">No tickets yet</div>'}
        </div>
        <div class="card">
            <div class="card-head"><h2>My devices</h2><button class="link" onclick="show('devices')">View all</button></div>
            ${devices.slice(0, 5).map((d) => statRow(d.device_model, badge(d.operational))).join("") || '<div class="empty">No devices assigned</div>'}
        </div>`;
}

function statRow(label, value) {
    return `<div class="stat-row"><span class="muted">${label}</span><span>${value ?? 0}</span></div>`;
}

function badge(value) {
    const tones = {
        fully: "green", partial: "amber", no: "red",
        open: "amber", in_progress: "cyan", resolved: "green", closed: "grey",
        critical: "red", high: "red", medium: "amber", low: "grey",
    };
    return `<span class="badge ${tones[value] || "grey"}">${String(value || "—").replace(/_/g, " ")}</span>`;
}

function table(el, headers, rows) {
    const target = document.getElementById(el);
    if (!rows.length) {
        target.innerHTML = `<tbody><tr><td class="empty" colspan="${headers.length}">Nothing to show yet</td></tr></tbody>`;
        return;
    }
    target.innerHTML =
        `<thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>` +
        `<tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c ?? "—"}</td>`).join("")}</tr>`).join("")}</tbody>`;
}

function renderDevices() {
    const term = (document.getElementById("device-search").value || "").toLowerCase();
    const rows = devices
        .filter((d) => !term || [d.device_model, d.device_manufacturer, d.imei1, d.serial_number, d.location]
            .some((v) => (v || "").toLowerCase().includes(term)))
        .map((d) => [
            d.device_model, d.device_manufacturer, d.device_type, d.imei1,
            badge(d.operational), d.under_maintenance ? badge("no") : badge("fully"),
            d.status, d.location, isOrg() ? d.agent_name || "Unassigned" : d.open_issues,
        ]);
    table("devices-table",
        ["Model", "Manufacturer", "Type", "IMEI 1", "Operational", "Maintenance", "Status", "Location",
            isOrg() ? "Assigned agent" : "Open issues"],
        rows);
}

function renderTickets() {
    const filter = document.getElementById("ticket-filter").value;
    const rows = tickets
        .filter((t) => filter === "all" || (filter === "resolved" ? t.status === "resolved" : t.status !== "resolved"))
        .map((t) => {
            const cells = [
                `#${t.id}`, t.title, t.category, badge(t.severity), badge(t.status),
                t.device_model || "—", (t.components || []).join(", ") || "—",
                (t.reported_at || "").slice(0, 10),
            ];
            if (isOrg()) {
                cells.push(t.status === "resolved"
                    ? t.resolved_by || "Resolved"
                    : `<button class="link" onclick="resolveTicket(${t.id})">Resolve</button>`);
            }
            return cells;
        });
    const headers = ["ID", "Title", "Category", "Severity", "Status", "Device", "Components", "Reported"];
    if (isOrg()) headers.push("Action");
    table("tickets-table", headers, rows);
}

function renderAgents() {
    table("agents-table",
        ["Name", "Email", "Phone", "Location", "Devices", "Enrollments"],
        agents.map((a) => [a.name, a.email, a.phone_number, a.location, a.devices, a.total_enrollments]));
}

function renderTicketForm() {
    const select = document.getElementById("ticket-device");
    select.innerHTML = devices.length
        ? devices.map((d) => `<option value="${d.id}">${d.device_model} · ${d.imei1}</option>`).join("")
        : '<option value="">No devices assigned</option>';
    renderComponents();
}

function renderComponents() {
    const category = document.getElementById("ticket-category").value;
    const list = components[category] || [];
    document.getElementById("ticket-components").innerHTML = list
        .map((c) => `<label><input type="checkbox" value="${c}"> ${c.replace(/_/g, " ")}</label>`)
        .join("");
}

async function submitTicket(event) {
    event.preventDefault();
    const deviceId = document.getElementById("ticket-device").value;
    if (!deviceId) return toast("You have no device to report on", "error");

    const payload = {
        device_id: Number(deviceId),
        category: document.getElementById("ticket-category").value,
        severity: document.getElementById("ticket-severity").value,
        title: document.getElementById("ticket-title").value.trim(),
        description: document.getElementById("ticket-description").value.trim(),
        components: [...document.querySelectorAll("#ticket-components input:checked")].map((i) => i.value),
    };
    if (!payload.title) return toast("Title is required", "error");

    try {
        await api("/tickets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        toast("Ticket created");
        document.getElementById("ticket-form").reset();
        await refresh();
        show("tickets");
    } catch (err) {
        toast(err.message, "error");
    }
}

async function resolveTicket(id) {
    try {
        await api(`/tickets/${id}/resolve`, { method: "POST" });
        toast("Ticket resolved");
        await refresh();
        renderTickets();
    } catch (err) {
        toast(err.message, "error");
    }
}

async function refresh() {
    stats = await api("/api/dashboard");
    tickets = await api("/tickets");
    devices = await api("/devices");
}

function renderProfile() {
    const rows = {
        Name: `${me.first_name} ${me.last_name}`,
        Email: me.email,
        Phone: me.phone_number,
        Address: me.address,
        Role: isOrg() ? "Organization admin" : "Agent",
        Organization: me.organization || "—",
    };
    if (isOrg()) rows["Registration"] = me.organization_registration || "—";
    document.getElementById("profile").innerHTML = Object.entries(rows)
        .map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("");
}

async function logout() {
    await fetch("/logout", { method: "POST" });
    window.location.href = "/";
}

function toast(message, type = "success") {
    const container = document.getElementById("toast-container");
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => el.remove(), 3200);
}

load();
