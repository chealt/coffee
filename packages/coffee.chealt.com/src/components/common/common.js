window.addEventListener('error', (error) => {
  const errorMessage = document.createElement('p');
  errorMessage.textContent = error.message;

  document.body.appendChild(errorMessage);

  // remove in 10 seconds
  setTimeout(() => {
    errorMessage.remove();
  }, 10 * 1000); // 10 seconds
});
