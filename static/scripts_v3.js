let map;
let markers;
let allCardData = [];
let currentPage = 1;
const itemsPerPage = 6; // 3열 2행 기준
const markerMap = new Map(); // 전역 변수로 선언 (좌표별 마커 참조 저장용)

document.addEventListener("DOMContentLoaded", function() {
    map = L.map('map', {
        zoomControl: false
    }).setView([20, 0], 2);

    // 기본 타일
    const baseLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap & CARTO',
        subdomains: 'abcd'
    });

    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles © Esri'
    });

    satelliteLayer.addTo(map);  // 기본 지도 적용

    const baseMaps = {
        "Satellite": satelliteLayer,
        "Standard Map": baseLayer
    };

    L.control.layers(baseMaps, null, { position: 'topright', collapsed: false }).addTo(map);

    // 마커 클러스터
    markers = L.markerClusterGroup({
        showCoverageOnHover: false,
        maxClusterRadius: 50
    });
    map.addLayer(markers);

    loadMarkers();
});

async function loadMarkers() {
    const startDateStr = document.getElementById("start-date").value;
    const endDateStr = document.getElementById("end-date").value;
    const category = document.getElementById("category-select").value;

    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    endDate.setHours(23, 59, 59, 999);

    try {
        Papa.parse('./static/world_250625.csv', {
            download: true,
            header: true,
            skipEmptyLines: true,
            complete: function(results) {
                const data = results.data;
                const features = [];
                let maxDate = null;

                data.forEach(row => {
                    const long = parseFloat(row["Long"]);
                    const lat = parseFloat(row["Lat"]);
                    
                    if (isNaN(long) || isNaN(lat) || long < -180 || long > 180 || lat < -90 || lat > 90) {
                        return;
                    }

                    const reportDateStr = row["보고일"];
                    if (!reportDateStr) return;
                    
                    const parsedDate = new Date(reportDateStr);
                    if (isNaN(parsedDate.getTime())) return;
                    
                    if (!maxDate || parsedDate > maxDate) {
                        maxDate = parsedDate;
                    }

                    if (parsedDate < startDate || parsedDate > endDate) {
                        return;
                    }

                    const gubun = row["구분"] || "";
                    const subSpecies = row["세부축종"] || "";
                    
                    if (category !== "all") {
                        if (category === "야생조료" || category === "야생조류") {
                            if (gubun !== "야생" && gubun !== "야생조류") return;
                        } else if (category === "가금") {
                            if (gubun !== "가금류" && gubun !== "사육") return;
                        } else if (category === "포유류") {
                            if (subSpecies !== "포유류") return;
                        }
                    }

                    features.push({
                        "type": "Feature",
                        "geometry": {
                            "type": "Point",
                            "coordinates": [long, lat]
                        },
                        "properties": {
                            "Country": row["국가명"] || "N/A",
                            "ReportDate": parsedDate.toISOString().split("T")[0],
                            "Serotype": row["혈청형"] || "N/A",
                            "Category": gubun || "N/A",
                            "Species": row["축종"] || "N/A",
                            "SubSpecies": subSpecies || "N/A"
                        }
                    });
                });

                const geojson = {
                    "type": "FeatureCollection",
                    "features": features
                };
                
                let updateTime = new Date();
                if (updateTime.getHours() < 9) {
                    updateTime.setDate(updateTime.getDate() - 1);
                }
                updateTime.setHours(9, 0, 0, 0);
                
                const pad = n => n.toString().padStart(2, '0');
                const formattedDate = `${updateTime.getFullYear()}-${pad(updateTime.getMonth()+1)}-${pad(updateTime.getDate())} ${pad(updateTime.getHours())}:${pad(updateTime.getMinutes())}`;
                document.getElementById("last-updated").textContent = formattedDate + " (WAHIS)";

                console.log("GeoJSON Features:", features.length);
                markers.clearLayers();

                const geoJsonLayer = L.geoJSON(geojson.features, {
                    pointToLayer: function (feature, latlng) {
                        const marker = L.circleMarker(latlng, {
                            radius: 8,
                            fillColor: "#F97316",
                            color: "#000",
                            weight: 1,
                            opacity: 1,
                            fillOpacity: 0.8
                        });
                        marker.feature = feature;
                        return marker;
                    },
                    onEachFeature: function (feature, layer) {
                        const props = feature.properties;
                        const popupContent = `
                            <b>Country:</b> ${props.Country}<br>
                            <b>Report Date:</b> ${props.ReportDate}<br>
                            <b>Serotype:</b> ${props.Serotype}
                        `;
                        layer.bindPopup(popupContent);

                        const key = `${feature.geometry.coordinates[1]}_${feature.geometry.coordinates[0]}`;
                        markerMap.set(key, layer);
                    }
                });

                markers.addLayer(geoJsonLayer);
                updateCards(geojson);
            },
            error: function(err) {
                console.error("PapaParse error:", err);
                alert("Failed to parse CSV data.");
            }
        });
    } catch (error) {
        console.error("Error loading markers:", error);
        alert("Failed to load map data: " + error.message);
    }
}

function updateCards(data) {
    const container = document.getElementById("cards-container");
    container.innerHTML = "";

    if (!data || !Array.isArray(data.features)) return;

    allCardData = data.features;
    
    allCardData.sort((a, b) => {
        const dateA = new Date(a.properties.ReportDate);
        const dateB = new Date(b.properties.ReportDate);
        return dateB - dateA;
    });
    currentPage = 1;

    renderPage();
    renderPagination();
}

function renderPage() {
    const container = document.getElementById("cards-container");
    container.innerHTML = "";

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const currentItems = allCardData.slice(start, end);

    currentItems.forEach((feature) => {
        const card = document.createElement("div");
        card.className = "card";

        const props = feature.properties;

        card.innerHTML = `
            <div class="card-title">${props.Country}</div>
            <div class="card-info">
                <strong>Report Date:</strong> ${props.ReportDate}<br>
                <strong>Serotype:</strong> ${props.Serotype}<br>
                <strong>Species:</strong> ${props.Species}<br>
                <strong>Category:</strong> ${props.Category}<br>
                <strong>SubSpecies:</strong> ${props.SubSpecies}<br>
            </div>
            <div class="card-buttons">
                <button onclick="flyToLocation(${feature.geometry.coordinates[1]}, ${feature.geometry.coordinates[0]}, '${feature.geometry.coordinates[1]}_${feature.geometry.coordinates[0]}')">Location</button>
            </div>
        `;
        container.appendChild(card);
    });
}

function renderPagination() {
    const pagination = document.getElementById("pagination");
    pagination.innerHTML = "";

    const totalPages = Math.ceil(allCardData.length / itemsPerPage);
    const pageBlock = Math.floor((currentPage - 1) / 10);
    const blockStart = pageBlock * 10 + 1;
    const blockEnd = Math.min(blockStart + 9, totalPages);

    if (blockStart > 1) {
        pagination.innerHTML += `<button onclick="goToPage(1)">«</button>`;
        pagination.innerHTML += `<button onclick="goToPage(${blockStart - 1})">‹</button>`;
    }

    for (let i = blockStart; i <= blockEnd; i++) {
        const btn = document.createElement("button");
        btn.textContent = i;
        if (i === currentPage) btn.classList.add("active");
        btn.setAttribute("onclick", `goToPage(${i})`);
        pagination.appendChild(btn);
    }

    if (blockEnd < totalPages) {
        pagination.innerHTML += `<button onclick="goToPage(${blockEnd + 1})">›</button>`;
        pagination.innerHTML += `<button onclick="goToPage(${totalPages})">»</button>`;
    }
}

function goToPage(page) {
    currentPage = page;
    renderPage();
    renderPagination();
}

function flyToLocation(lat, lng, key) {
    if (!map) return;

    const marker = markerMap.get(key);
    if (!marker) {
        console.warn("해당 마커를 찾을 수 없습니다.");
        return;
    }

    // 클러스터를 풀면서 해당 마커를 보여주기 위한 확대
    markers.zoomToShowLayer(marker, function () {
        // 확대 후 마커 위치로 이동
        map.setView([lat, lng]); 
        marker.openPopup();
    });
}


function updateGraph() {
    console.log("Graph update triggered");
}

function updateMap() {
    loadMarkers();
}