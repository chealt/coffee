const content = ({ username, registrationCode }) => `
  <h1>Hello!</h1>
  <p>Register on Central Beans by following <a href="https://centralbeans.com/registration/${username}?code=${registrationCode}">this link</a>.</p>
  <p>This link will work for the next 24 hours. Contact support at <a href="mailto:info@chealt.com">info@chealt.com</a> to receive a new registration link.</p>
`;

export default content;
