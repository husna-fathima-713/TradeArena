const API_URL = "http://localhost:5000";

export async function getPrices() {
  const res = await fetch(`${API_URL}/prices`);
  if (!res.ok) throw new Error("Failed to fetch prices");
  return res.json();
}