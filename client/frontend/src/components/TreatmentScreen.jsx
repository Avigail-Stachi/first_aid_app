

import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

export default function TreatmentScreen() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const caseType = searchParams.get("case_type");
  const degree = searchParams.get("degree");
  const initialCount = parseInt(searchParams.get("count"), 10) || 0;
  const [count, setCount] = useState(initialCount);

  // Fetch whenever caseType, count, or degree changes
  useEffect(() => {
    if (!caseType) return;
    const fetchTreatment = async () => {
      if (!caseType || count === undefined) return;
      try {
        const url = new URL(`${process.env.REACT_APP_API_URL}/treatment`);
        url.searchParams.append("case_type", caseType);
        url.searchParams.append("count", count);
        if (degree) url.searchParams.append("degree", degree);

        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch");
        const json = await res.json();
        setData(json.result);
      } catch (err) {
        setError(err.message);
      }
    };
    fetchTreatment();
  }, [caseType, count, degree]);

  const handleDidntUnderstand = () => {
    if (count < 3) {
      const next = count + 1;
      setCount(next);
      // update URL so `count` param matches state
      setSearchParams((prev) => {
        const updated = new URLSearchParams(prev);
        updated.set("count", next);
        return updated;
      });
    }
  };

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", padding: "2rem" }}>
      <h2>Treatment Instructions</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {!error && !data && <p>Loading...</p>}
      {data && typeof data === "string" && <p>{data}</p>}
      {data && data.type === "image" && (
        <img
          src={data.url}
          alt="treatment visual"
          style={{ maxWidth: "100%" }}
        />
      )}
      {data && data.type === "video" && (
        <video controls style={{ maxWidth: "100%" }}>
          <source src={data.url} type="video/mp4" />
          Your browser does not support video.
        </video>
      )}

      <div style={{ marginTop: "1.5rem" }}>
        <button onClick={() => navigate(-1)} style={{ marginRight: "1rem" }}>
          Start New Chat
        </button>
        {count < 3 && (
          <button onClick={handleDidntUnderstand}>
           I didn't understand
          </button>
        )}
      </div>
    </div>
  );
}
