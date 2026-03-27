document.addEventListener("DOMContentLoaded", function() {
    // Leaflet 지도 초기화
    const map = L.map('map').setView([20, 0], 2); // 초기 중심: 세계

    // CARTO 지도 타일 사용
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

    const markers = L.markerClusterGroup({
        showCoverageOnHover: false // 클러스터 범위 강조 비활성화
    });

    async function loadFilteredMarkers() {
        const startDate = document.getElementById("start-date").value;
        const endDate = document.getElementById("end-date").value;

        try {
            const response = await fetch(`/worlds/markers?start_date=${startDate}&end_date=${endDate}`);
            const data = await response.json();

            markers.clearLayers();

            L.geoJSON(data, {
                pointToLayer: function (feature, latlng) {
                    return L.circleMarker(latlng, {
                        radius: 8,
                        fillColor: "#ff7800",
                        color: "#000",
                        weight: 1,
                        opacity: 1,
                        fillOpacity: 0.8
                    });
                },
                onEachFeature: function (feature, layer) {
                    const props = feature.properties;
                    const popupContent = `
                        <b>국가:</b> ${props.Country}<br>
                        <b>보고일:</b> ${props.ReportDate}<br>
                        <b>혈청형:</b> ${props.Serotype}<br>
                        <b>구분:</b> ${props.Category}<br>
                        <b>축종:</b> ${props.Species}<br>
                        <b>세부축종:</b> ${props.SubSpecies}
                    `;
                    layer.bindPopup(popupContent);
                }
            }).addTo(markers);

            map.addLayer(markers);
        } catch (error) {
            console.error("Error loading filtered markers:", error);
        }
    }

    // 초기 지도 표시
    loadFilteredMarkers();

    // 그래프 업데이트 함수
    window.updateGraph = function() {
        const season = document.getElementById('season').value;
        const range = document.getElementById('range').value;
        const graphImage = document.getElementById('graph-img');
        graphImage.src = `/static/worlds/${season}_${range}.png`;
        graphImage.style.display = 'block';
    };
});