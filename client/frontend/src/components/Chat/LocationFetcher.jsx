import { useEffect, useRef, useState } from "react";
import "../../styles/LocationFetcher.css";

function LocationFetcher({ onLocation }) {
  const calledRef = useRef(false);
  const [location, setLocation] = useState(null); // {lat, lng}
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");
  const [error, setError] = useState(null);

  async function getAddressFromCoords(lat, lng) {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=en`;
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "EmergencyApp/1.0",
        },
      });
      const data = await res.json();
      return data.display_name || `${lat}, ${lng}`;
    } catch (error) {
      console.error("Reverse geocoding failed", error);
      return `${lat}, ${lng}`;
    }
  }
  useEffect(() => {
    if (calledRef.current) return; // אם כבר קרינו פעם אחת — לא עושים שוב
    calledRef.current = true; // מסמנים שעכשיו קרינו

    console.log("LocationFetcher mounted (first time only)");

    if (!navigator.geolocation) {
      console.error("Geolocation is not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const address = await getAddressFromCoords(latitude, longitude);
        const fullLocation = { lat: latitude, lng: longitude, address };
        setLocation(fullLocation);
      },
      (error) => {
        setError(
          "Unable to get your location automatically. Please enter manually."
        );
        setShowManualForm(true);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, []);
  const handleConfirm = () => {
    if (location) {
      onLocation(location);
    }
  };
  const handleChange = () => {
    setShowManualForm(true);
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (
      isNaN(lat) ||
      isNaN(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      setError("Please enter valid latitude and longitude.");
      return;
    }
    const address = await getAddressFromCoords(lat, lng);
    const manualLocation = { lat, lng, address };
    setLocation(manualLocation);
    onLocation(manualLocation);

    setManualLat("");
    setManualLng("");
    setShowManualForm(false);
    setError(null);
  };
  return (
    <div className="location-fetcher-container">
      {error && <p className="error-message">{error}</p>}

      {!location && !error && (
        <p className="info-message">
          Trying to get your location automatically...
        </p>
      )}

      {location && !showManualForm && (
        <div className="location-confirmation">
          <p>This is the location we found:</p>
          <p>{location.address}</p>
          <button onClick={handleConfirm}>confirm</button>
          <button onClick={handleChange}>change</button>
        </div>
      )}

      {showManualForm && (
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
      )}
    </div>
  );
}

export default LocationFetcher;
