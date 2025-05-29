import { useEffect,useRef,useState } from "react";
import "../../styles/LocationFetcher.css";
function LocationFetcher({ onLocation }) {
  const calledRef = useRef(false);
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    if (calledRef.current) return;   // אם כבר קרינו פעם אחת — לא עושים שוב
    calledRef.current = true;        // מסמנים שעכשיו קרינו

    console.log("LocationFetcher mounted (first time only)");

    if (!navigator.geolocation) {
      console.error("Geolocation is not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        onLocation({ lat: latitude, lng: longitude });
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
  }, [onLocation]);
  const handleManualSubmit = (e) => {
    e.preventDefault();
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (isNaN(lat) || isNaN(lng) ||lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setError("Please enter valid latitude and longitude.");
      return;
    }
    setError(null);
    onLocation({ lat, lng });
    setManualLat("");
    setManualLng("");
  }
return (
    <div className="location-fetcher-container">
      <p className={error ? "error-message" : "info-message"}>
        {error ? error : "Trying to get your location automatically..."}
      </p>
      <form onSubmit={handleManualSubmit} className="location-form">
        <div className="input-group">
          <label htmlFor="lat">Latitude:</label>
          <input
            id="lat"
            type="text"
            value={manualLat}
            onChange={(e) => setManualLat(e.target.value)}
            placeholder="e.g. 32.0853"
          />
        </div>
        <div className="input-group">
          <label htmlFor="lng">Longitude:</label>
          <input
            id="lng"
            type="text"
            value={manualLng}
            onChange={(e) => setManualLng(e.target.value)}
            placeholder="e.g. 34.7818"
          />
        </div>
        <button type="submit" className="submit-button">
          Submit Location Manually
        </button>
      </form>
    </div>
  );
}

// function LocationFetcher({ onLocation }) {
//     useEffect(() => {
//         console.log("LocationFetcher mounted");
//         if(!navigator.geolocation) {
//             console.error("Geolocation is not supported by your browser.");
//             return;
//         }
//         navigator.geolocation.getCurrentPosition(
//             (position) => {
//                 const { latitude, longitude } = position.coords;
//                 onLocation({lat: latitude,lng: longitude });
//             },
//             (error) => {
//                 console.error("Error fetching location:", error.message);
//             },
//             {
//                 enableHighAccuracy: true,
//                 timeout: 10000,
//                 maximumAge: 0,
//             }   
//         );
//     }, [onLocation]);
//     return null;   //לא צריך להציג UI
// }

export default LocationFetcher;