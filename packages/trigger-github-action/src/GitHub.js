const triggerAction = async ({ body, token, owner, repo, workflow }) => {
  const githubUrl = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflow}.yml/dispatches`;

  const response = await fetch(githubUrl, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });

  return response;
};

export { triggerAction };
