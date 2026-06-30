export async function shareCode(code: string): Promise<void> {
  const message = `Gå med i våra budgethinkar! Ange koden ${code} i appen Budgethinkar.`;

  if (navigator.share) {
    await navigator.share({ text: message });
    return;
  }

  await navigator.clipboard.writeText(code);
  window.alert(`Koden ${code} har kopierats till urklipp.`);
}
