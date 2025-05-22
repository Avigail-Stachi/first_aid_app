import { useEffect } from "react";

function LocationFetcher({ onLocathion }) {
    useEffect(() => {
        if(!navigator.geolocation) {
            console.error("Geolocation is not supported by your browser.");
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                onLocathion({lat: latitude,lng: longitude });
            },
            (error) => {
                console.error("Error fetching location:", error.message);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
            }   
        );
    }, []);
    return null;   //לא צריך להציג UI
}
export default LocationFetcher;