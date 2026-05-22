async function fetchAndPrint() {
  try {
    const res = await fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vQiwOvB1RCZ38CYVdKK76XDKRQQv4XTpV56TpYVBCo6-AcRFWac7jESNNDkRf-iBLAlNEESY240sKhX/pub?gid=1072960483&single=true&output=csv');
    const text = await res.text();
    console.log(text.split('\n').slice(0, 5).join('\n'));
  } catch (e) {
    console.error(e);
  }
}
fetchAndPrint();
