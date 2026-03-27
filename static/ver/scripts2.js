let map;
let markers;
let currentTileLayer;

document.addEventListener("DOMContentLoaded", function() {
    // 지도 초기화 (확대/축소 버튼 비활성화)
    map = L.map('map', {
        zoomControl: false  // 확대/축소 컨트롤 비활성화
    }).setView([20, 0], 2);

    // 기본 타일 레이어 설정 (OpenStreetMap)
    currentTileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // 마커 클러스터 그룹 생성
    markers = L.markerClusterGroup({
        showCoverageOnHover: false,
        maxClusterRadius: 50
    });
    map.addLayer(markers);

    // 초기 마커 로드
    loadMarkers();
});

function updateMap() {
    loadMarkers();
}

async function loadMarkers() {
    const startDate = document.getElementById("start-date").value;
    const endDate = document.getElementById("end-date").value;
    const season = document.getElementById("season").value;
    const range = document.getElementById("range").value;

    try {
        const response = await fetch(`/worlds/markers?start_date=${startDate}&end_date=${endDate}&season=${season}&range=${range}`);
        const data = await response.json();
        console.log("Received Data:", data);

        if (!data || !data.type || data.type !== "FeatureCollection") {
            throw new Error("Invalid GeoJSON format from server");
        }

        markers.clearLayers();

        const geoJsonLayer = L.geoJSON(data, {
            pointToLayer: function(feature, latlng) {
                return L.circleMarker(latlng, {
                    radius: 8,
                    fillColor: "#F97316",
                    color: "#000",
                    weight: 1,
                    opacity: 1,
                    fillOpacity: 0.8
                });
            },
            onEachFeature: function(feature, layer) {
                const props = feature.properties;
                layer.bindPopup(`
                    <b>Country:</b> ${props.Country}<br>
                    <b>Report Date:</b> ${props.ReportDate}<br>
                    <b>Serotype:</b> ${props.Serotype}
                `);
            }
        });

        markers.addLayer(geoJsonLayer);
    } catch (error) {
        console.error("Error loading markers:", error);
        alert("Failed to load map data: " + error.message);
    }
}

function updateTileLayer() {
    const tileLayerSelect = document.getElementById("tile-layer").value;
    map.removeLayer(currentTileLayer);

    switch (tileLayerSelect) {
        case "osm":
            currentTileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            });
            break;
        case "carto":
            currentTileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
                attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors & © <a href="https://carto.com/">CARTO</a>',
                subdomains: 'abcd'
            });
            break;
        case "stamen":
            currentTileLayer = L.tileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/terrain/{z}/{x}/{y}.jpg', {
                attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, under <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a>. Data by <a href="http://openstreetmap.org">OpenStreetMap</a>, under <a href="http://www.openstreetmap.org/copyright">ODbL</a>.',
                subdomains: 'abcd'
            });
            break;
        case "esri":
            currentTileLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
                attribution: 'Tiles © <a href="https://www.esri.com/">Esri</a> & contributors'
            });
            break;
    }

    currentTileLayer.addTo(map);
}

function updateGraph() {
    console.log("Graph update triggered");
}