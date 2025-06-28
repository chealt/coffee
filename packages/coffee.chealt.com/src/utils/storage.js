const setItem = async (key, value) => {
  const response = await fetch('/api/storage/set-item.json', {
    method: 'POST',
    body: JSON.stringify({ key, value })
  });

  return response.json();
};

const deleteItem = async (key, value) => {
  const response = await fetch('/api/storage/delete-item.json', {
    method: 'DELETE',
    body: JSON.stringify({ key, value })
  });

  return response.json();
};

export { deleteItem, setItem };
