const { spawn } = require('child_process');

const vitest = spawn('npx', ['vitest', 'run', '--reporter=verbose'], {
  env: { ...process.env, CI: 'true', VITEST_WATCH: 'false' },
  stdio: 'inherit',
  shell: true
});

vitest.on('close', (code) => {
  process.exit(code);
});
