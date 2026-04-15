const bcrypt = require('bcryptjs');

async function main() {
  const password = '123456';
  const hashFromDb = '$2b$10$VMdEAFG0fQ4rOcpHWO.ele44/46zC.wH6gLTF7p2g3g1Y3UeXg2.m';

  const isMatch = await bcrypt.compare(password, hashFromDb);
  console.log('Match:', isMatch);
}

main();