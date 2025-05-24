import { useEffect,useRef } from "react";
function LocationFetcher({ onLocation }) {
  const calledRef = useRef(false);

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

  return null;
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