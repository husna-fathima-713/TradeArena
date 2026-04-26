const API_URL = "https://tradearena-1.onrender.com";

export async function getPrices() {
  const res = await fetch(`${API_URL}/prices`);
  if (!res.ok) throw new Error("Failed to fetch prices");
  return res.json();
}