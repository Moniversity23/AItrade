document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('form');
    const errorMessage = document.getElementById('errorMessage');
  
    form.addEventListener('submit', (event) => {
      const depositAmount = parseFloat(document.getElementById('depositAmount').value);
  
      if (isNaN(depositAmount) || depositAmount <= 0) {
        event.preventDefault();
        errorMessage.textContent = 'Please enter a valid deposit amount.';
        errorMessage.style.display = 'block';
      }
    });
  });