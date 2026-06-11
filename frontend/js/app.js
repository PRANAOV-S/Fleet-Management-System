const BASE_URL = window.location.protocol === 'file:' ? 'http://127.0.0.1:5000' : window.location.origin;
const API_URL = `${BASE_URL}/api`;

// Handle Navigation visibility based on Auth State
function updateNavState() {
    const token = localStorage.getItem('token');
    if (token) {
        if(document.getElementById('nav-login')) document.getElementById('nav-login').classList.add('hidden');
        if(document.getElementById('nav-register')) document.getElementById('nav-register').classList.add('hidden');
        if(document.getElementById('nav-logout')) document.getElementById('nav-logout').classList.remove('hidden');
        if(document.getElementById('nav-dashboard')) {
            document.getElementById('nav-dashboard').classList.remove('hidden');
            const role = localStorage.getItem('role');
            document.getElementById('nav-dashboard').href = role === 'admin' ? 'admin-dashboard.html' : 'user-dashboard.html';
        }
    }
}

function checkAuth() {
    if (!localStorage.getItem('token')) {
        window.location.href = 'login.html';
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('name');
    window.location.href = 'index.html';
}

// On Page Load Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    updateNavState();

    // -- Login Form Logic --
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            try {
                const response = await fetch(`${API_URL}/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const data = await response.json();
                
                if (response.ok) {
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('role', data.role);
                    localStorage.setItem('name', data.name);
                    window.location.href = data.role === 'admin' ? 'admin-dashboard.html' : 'user-dashboard.html';
                } else {
                    alert(data.message || 'Login failed');
                }
            } catch (err) {
                alert('Connection error. Is the backend running?');
                console.error(err);
            }
        });
    }

    // -- Register Form Logic --
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const role = document.getElementById('role').value;

            try {
                const response = await fetch(`${API_URL}/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, password, role })
                });
                const data = await response.json();
                
                if (response.ok) {
                    alert('Registration successful! Please login.');
                    window.location.href = 'login.html';
                } else {
                    alert(data.message || 'Registration failed');
                }
            } catch (err) {
                alert('Connection error. Is the backend running?');
                console.error(err);
            }
        });
    }

    // -- Report Submission Logic --
    const reportForm = document.getElementById('report-form');
    if (reportForm) {
        reportForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const desc = document.getElementById('description').value;
            const lat = document.getElementById('latitude').value;
            const lng = document.getElementById('longitude').value;
            const imageFile = document.getElementById('image').files[0];

            if (!lat || !lng) {
                alert("Please get GPS location first!");
                return;
            }

            const formData = new FormData();
            formData.append('description', desc);
            formData.append('latitude', lat);
            formData.append('longitude', lng);
            if (imageFile) formData.append('image', imageFile);

            const btn = reportForm.querySelector('button[type="submit"]');
            btn.disabled = true;
            btn.innerText = "Submitting...";

            try {
                const response = await fetch(`${API_URL}/reports`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: formData
                });
                
                const data = await response.json();
                if (response.ok) {
                    alert('Report submitted successfully!');
                    window.location.href = 'user-dashboard.html';
                } else {
                    alert(data.message || 'Submission failed');
                    btn.disabled = false;
                    btn.innerText = "Submit Report";
                }
            } catch (err) {
                alert('Upload error. File too large or backend not running.');
                console.error(err);
                btn.disabled = false;
                btn.innerText = "Submit Report";
            }
        });
    }

    // -- Driver Check-in Logic --
    const driverForm = document.getElementById('driver-form');
    if (driverForm) {
        driverForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const driver_name = document.getElementById('driver_name').value;
            const shifts = document.getElementById('shifts').value;
            const lorry_number = document.getElementById('lorry_number').value;
            const expected_time = document.getElementById('expected_time').value;
            const latitude = document.getElementById('latitude').value;
            const longitude = document.getElementById('longitude').value;

            if (!latitude || latitude === "Detecting...") {
                alert("Please wait for GPS location detection or click again.");
                return;
            }

            // Using dummy token check for now since it requires auth or we could let anyone submit
            let token = localStorage.getItem('token') || "dummy";

            try {
                const response = await fetch(`${API_URL}/driver_logs`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ driver_name, shifts, lorry_number, expected_time, latitude, longitude })
                });

                const data = await response.json();
                
                driverForm.style.display = 'none';

                if (data.punctual) {
                    document.getElementById('success-box').style.display = 'block';
                } else {
                    document.getElementById('alarm-box').style.display = 'block';
                    try {
                        document.getElementById('alarm-audio').play();
                    } catch(err) {
                        console.log("Audio autoplay blocked, but alarm displays visually.");
                    }
                }
            } catch (err) {
                console.error(err);
                alert("Backend error.");
            }
        });
    }
});

function stopAlarm() {
    const audio = document.getElementById('alarm-audio');
    if(audio) audio.pause();
    window.location.href = 'index.html';
}

// -- Geolocation Magic --
function getLocation() {
    const latInput = document.getElementById('latitude');
    const lngInput = document.getElementById('longitude');

    if (navigator.geolocation) {
        latInput.value = "Detecting...";
        lngInput.value = "Detecting...";
        navigator.geolocation.getCurrentPosition(
            (position) => {
                latInput.value = position.coords.latitude;
                lngInput.value = position.coords.longitude;
                
                const gmap = document.getElementById('gmaps-link');
                if(gmap) {
                    gmap.href = `https://www.google.com/maps/search/?api=1&query=${position.coords.latitude},${position.coords.longitude}`;
                    gmap.style.display = 'block';
                }
            },
            (error) => {
                alert("Location access denied or unavailable. Using default coordinates for testing.");
                latInput.value = "13.0827"; // Defaulting to Chennai for visualization
                lngInput.value = "80.2707";
                
                const gmap = document.getElementById('gmaps-link');
                if(gmap) {
                    gmap.href = `https://www.google.com/maps/search/?api=1&query=13.0827,80.2707`;
                    gmap.style.display = 'block';
                }
            }
        );
    } else {
        alert("Geolocation is not supported. Using defaults.");
        latInput.value = "13.0827";
        lngInput.value = "80.2707";
    }
}

function getStatusBadge(status) {
    if (status === 'Pending') return `<span class="status-badge status-pending">Pending</span>`;
    if (status === 'In Progress') return `<span class="status-badge status-progress">In Progress</span>`;
    if (status === 'Completed') return `<span class="status-badge status-completed">Completed</span>`;
    return `<span class="status-badge">${status}</span>`;
}

// -- User Data Dashboard --
async function loadUserReports() {
    const container = document.getElementById('user-reports');
    try {
        const res = await fetch(`${API_URL}/reports`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if(res.status === 401) {
            logout();
            return;
        }

        const data = await res.json();
        
        if (!data.reports || data.reports.length === 0) {
            container.innerHTML = '<p style="color: #cbd5e1; grid-column: 1 / -1; text-align:center; padding: 2rem;">No reports found. Help keep the city clean by submitting a report.</p>';
            return;
        }

        container.innerHTML = data.reports.map(r => `
            <div class="report-card">
                <img src="${r.image_url ? BASE_URL + r.image_url : 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=600&q=80'}" class="report-img" alt="Garbage">
                <div class="report-details">
                    ${getStatusBadge(r.status)}
                    <h4 style="margin-bottom: 0.5rem; font-size:1.1rem;">Details</h4>
                    <p style="margin-bottom: 1rem; color: #cbd5e1; text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">${r.description}</p>
                    
                    <div style="display:flex; justify-content:space-between; align-items:center; border-top: 1px solid var(--border); padding-top:1rem; flex-wrap:wrap; gap:10px;">
                        <span style="font-size: 0.85rem; color: #94a3b8;">📅 ${r.created_at}</span>
                        <a href="https://www.google.com/maps/search/?api=1&query=${r.latitude},${r.longitude}" target="_blank" class="btn btn-outline" style="padding: 0.4rem 0.8rem; font-size:0.8rem;">📍 View Map</a>
                    </div>
                </div>
            </div>
        `).join('');

    } catch(err) {
        console.error(err);
        container.innerHTML = `<p style="color:red; grid-column: 1 / -1;">Error loading reports from backend.</p>`;
    }
}

// -- Admin Dashboard logic --
async function loadAdminReports() {
    const container = document.getElementById('admin-reports');
    try {
        const res = await fetch(`${API_URL}/reports`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if(res.status === 401) { logout(); return; }

        const data = await res.json();
        
        if (!data.reports || data.reports.length === 0) {
            container.innerHTML = '<p style="color: #cbd5e1; grid-column: 1 / -1;">No reports in the system.</p>';
            return;
        }

        container.innerHTML = data.reports.map(r => `
            <div class="report-card">
                <img src="${r.image_url ? BASE_URL + r.image_url : 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=600&q=80'}" class="report-img" alt="Garbage">
                <div class="report-details">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1rem;">
                        ${getStatusBadge(r.status)}
                        <span style="font-size: 0.8rem; color:#94a3b8;">ID: #${r.id}</span>
                    </div>
                    
                    <p style="margin-bottom: 0.5rem; color:#e2e8f0; font-size:0.95rem;"><strong>Desc:</strong> ${r.description}</p>
                    <p style="font-size: 0.85rem; color: #94a3b8; margin-bottom: 1rem;">📅 ${r.created_at}</p>
                    
                    <label style="display:block; font-size:0.85rem; margin-bottom:0.3rem;">Update Status:</label>
                    <select class="form-control" onchange="updateStatus(${r.id}, this.value)" style="padding: 0.6rem; font-size:0.9rem; margin-bottom:1rem; cursor:pointer;">
                        <option value="Pending" ${r.status === 'Pending' ? 'selected' : ''}>⏳ Pending</option>
                        <option value="In Progress" ${r.status === 'In Progress' ? 'selected' : ''}>🚚 In Progress</option>
                        <option value="Completed" ${r.status === 'Completed' ? 'selected' : ''}>✅ Completed</option>
                    </select>

                    <a href="https://www.google.com/maps/search/?api=1&query=${r.latitude},${r.longitude}" target="_blank" class="btn btn-outline" style="width:100%; padding:0.5rem; font-size:0.9rem;">📍 Open in Maps</a>
                </div>
            </div>
        `).join('');

        // Also fetch constraints for Drivers 
        if (document.getElementById('admin-drivers')) {
            const drvRes = await fetch(`${API_URL}/driver_logs`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }});
            const drvData = await drvRes.json();
            const drvContainer = document.getElementById('admin-drivers');
            
            if(!drvData.driver_logs || drvData.driver_logs.length === 0) {
                 drvContainer.innerHTML = '<p style="color: #cbd5e1; grid-column: 1 / -1;">No driver deployments recorded.</p>';
            } else {
                 drvContainer.innerHTML = drvData.driver_logs.map(d => `
                    <div class="report-card" style="background: rgba(15, 23, 42, 0.9); border-color: ${d.punctual ? 'var(--secondary)' : 'var(--danger)'}; padding: 1.5rem;">
                        <h3 style="color:${d.punctual ? 'var(--secondary)' : 'var(--danger)'}; margin-bottom: 10px;">🚚 ${d.driver_name}</h3>
                        <p style="font-size:0.9rem; color:#cbd5e1; margin-bottom: 5px;"><b>Lorry No:</b> ${d.lorry_number}</p>
                        <p style="font-size:0.9rem; color:#cbd5e1; margin-bottom: 5px;"><b>Shifts:</b> ${d.shifts}</p>
                        <p style="font-size:0.9rem; color:#cbd5e1; margin-bottom: 5px;"><b>Expected Time:</b> ${d.expected_time}</p>
                        <p style="font-size:0.9rem; margin-bottom: 15px;"><b>Status:</b> ${d.punctual ? '<span style="color:#10b981;">On Time</span>' : '<span style="color:var(--danger); font-weight:bold;">Late Penalty Active</span>'}</p>
                        <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--border); padding-top:10px;">
                            <span style="font-size: 0.8rem; color: #94a3b8;">📅 ${d.timestamp}</span>
                            <a href="https://www.google.com/maps/search/?api=1&query=${d.latitude},${d.longitude}" target="_blank" class="btn btn-primary" style="font-size:0.8rem; padding:0.4rem 0.8rem;">🗺️ Track Driver</a>
                        </div>
                    </div>
                 `).join('');
            }
        }
    } catch(err) {
        console.error(err);
        container.innerHTML = `<p style="color:red; grid-column: 1 / -1;">Error loading reports.</p>`;
    }
}

async function updateStatus(id, status) {
    try {
        const res = await fetch(`${API_URL}/reports/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ status })
        });
        if (res.ok) {
            // Hot reload admin stats and color badges
            loadAdminStats();
            loadAdminReports();
        } else {
            alert('Failed to update status');
        }
    } catch (err) {
        console.error(err);
    }
}

let chartInstance = null;
async function loadAdminStats() {
    try {
        const res = await fetch(`${API_URL}/stats`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if(!res.ok) return;

        const data = await res.json();
        
        document.getElementById('stat-total').innerText = data.total;
        document.getElementById('stat-pending').innerText = data.pending;
        document.getElementById('stat-progress').innerText = data.in_progress;
        document.getElementById('stat-completed').innerText = data.completed;

        // Render Chart
        const ctx = document.getElementById('statusChart');
        if(!ctx) return;

        if (chartInstance) {
            chartInstance.destroy();
        }
        
        // Define gradient colors
        const ctx2d = ctx.getContext('2d');
        const gradientP = ctx2d.createLinearGradient(0, 0, 0, 400);
        gradientP.addColorStop(0, 'rgba(239, 68, 68, 1)');
        
        chartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Pending', 'In Progress', 'Completed'],
                datasets: [{
                    data: [data.pending, data.in_progress, data.completed],
                    backgroundColor: ['#ef4444', '#f59e0b', '#10b981'],
                    borderWidth: 0,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { 
                            color: '#e2e8f0',
                            padding: 20,
                            font: { family: "'Outfit', sans-serif", size: 14 }
                        }
                    }
                },
                cutout: '70%'
            }
        });
    } catch (err) {
        console.error(err);
    }
}

// -- Leaflet Map Initialization --
async function loadMap() {
    if (!document.getElementById('map')) return;

    const map = L.map('map').setView([20, 0], 2);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(map);

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            L.marker([20, 0]).addTo(map).bindPopup("<i>Login required to see garbage hotspots.</i>");
            return;
        }

        const res = await fetch(`${API_URL}/reports`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if(res.ok) {
            const data = await res.json();
            const reports = data.reports;
            
            if (reports && reports.length > 0) {
                // Determine bounding box
                const bounds = [];
                
                reports.forEach(r => {
                    let color = '#ef4444'; // Red
                    let shadowMsg = 'Pending...';
                    if (r.status === 'In Progress') { 
                        color = '#f59e0b'; // Amber
                        shadowMsg = 'Working...';
                    }
                    if (r.status === 'Completed') {
                        color = '#10b981'; // Green
                        shadowMsg = 'Cleaned!';
                    }

                    const markerHtml = `
                        <div style="background-color: ${color}; width: 22px; height: 22px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px ${color};"></div>
                    `;
                    const customIcon = L.divIcon({
                        html: markerHtml,
                        className: 'custom-map-marker',
                        iconSize: [22, 22],
                        iconAnchor: [11, 11]
                    });

                    bounds.push([r.latitude, r.longitude]);

                    const popupContent = `
                        <div style="font-family:'Outfit',sans-serif; color:#0f172a;">
                            <h4 style="margin:0 0 5px 0;">${shadowMsg}</h4>
                            <p style="margin:0 0 5px 0; font-size:13px;">${r.description}</p>
                            ${r.image_url ? `<img src="${BASE_URL}${r.image_url}" style="width:150px; height:auto; border-radius:8px; margin-top:5px;">` : ''}
                        </div>
                    `;

                    L.marker([r.latitude, r.longitude], {icon: customIcon})
                     .addTo(map)
                     .bindPopup(popupContent);
                });

                if(bounds.length > 0) {
                    map.fitBounds(bounds, { padding: [50, 50] });
                }
            } else {
                 L.marker([20, 0]).addTo(map).bindPopup("No reports found.");
            }
        }

        // Fetch Drivers
        const driverRes = await fetch(`${API_URL}/driver_logs`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if(driverRes.ok) {
            const driverData = await driverRes.json();
            
            const fleetList = document.getElementById('fleet-list');
            if (fleetList) fleetList.innerHTML = ''; // Start clean

            const searchInput = document.getElementById('lorry-search');

            if(driverData.driver_logs) {
                if (fleetList && driverData.driver_logs.length === 0) {
                    fleetList.innerHTML = '<p style="color: #cbd5e1; font-size: 0.9rem;">No fleet recorded.</p>';
                }

                driverData.driver_logs.forEach(d => {
                    let color = d.punctual ? '#3b82f6' : '#ef4444'; // Blue if punctual, red if late
                    const markerHtml = `
                        <div style="background-color: ${color}; width: 22px; height: 22px; border-radius: 4px; border: 2px solid white; box-shadow: 0 0 10px ${color}; display:flex; justify-content:center; align-items:center; font-size:12px;">🚚</div>
                    `;
                    const customIcon = L.divIcon({
                        html: markerHtml,
                        className: 'custom-map-marker',
                        iconSize: [22, 22],
                        iconAnchor: [11, 11]
                    });

                    const popupContent = `
                        <div style="font-family:'Outfit',sans-serif; color:#0f172a;">
                            <h4 style="margin:0 0 5px 0;">🚚 ${d.driver_name}</h4>
                            <p style="margin:0 0 2px 0; font-size:13px;"><b>Lorry:</b> ${d.lorry_number}</p>
                            <p style="margin:0 0 2px 0; font-size:13px;"><b>Shifts:</b> ${d.shifts}</p>
                            <p style="margin:0 0 2px 0; font-size:13px;"><b>Status:</b> ${d.punctual ? '<span style="color:green;">On Time</span>' : '<span style="color:red; font-weight:bold;">Late Alarm Triggered</span>'}</p>
                            <p style="margin:0 0 2px 0; font-size:11px; color:#64748b;">${d.timestamp}</p>
                        </div>
                    `;

                    const marker = L.marker([d.latitude, d.longitude], {icon: customIcon})
                     .addTo(map)
                     .bindPopup(popupContent);
                     
                    // Add logic to Map Sidebar Sidebar
                    if (fleetList) {
                        const item = document.createElement('div');
                        item.style = 'padding: 10px; border-bottom: 1px solid var(--border); cursor: pointer;  transition: background 0.3s;';
                        item.className = 'fleet-item';
                        item.innerHTML = `
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <strong style="color: #f8fafc; font-size: 1.05rem;">${d.lorry_number}</strong>
                                <span style="color:${color}; font-size:0.9rem;">●</span>
                            </div>
                            <div style="font-size:0.85rem; color:#cbd5e1; margin-top:3px;">
                                🧑‍✈️ ${d.driver_name} 
                            </div>
                        `;
                        // Hover effect
                        item.onmouseover = () => item.style.backgroundColor = 'rgba(255,255,255,0.05)';
                        item.onmouseout = () => item.style.backgroundColor = 'transparent';
                        
                        // Click to view on map
                        item.onclick = () => {
                            map.setView([d.latitude, d.longitude], 18, { animate: true });
                            marker.openPopup();
                        };
                        fleetList.appendChild(item);
                    }
                });

                // Attach Search Handler
                if (searchInput && fleetList) {
                    searchInput.addEventListener('input', (e) => {
                        const term = e.target.value.toLowerCase();
                        const items = fleetList.getElementsByClassName('fleet-item');
                        for(let i=0; i<items.length; i++) {
                            const text = items[i].innerText.toLowerCase();
                            items[i].style.display = text.includes(term) ? 'block' : 'none';
                        }
                    });
                }
            }
        }

    } catch (err) {
        console.error(err);
    }
}
