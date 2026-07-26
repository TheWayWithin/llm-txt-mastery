// Husky v9's documented guard for production/CI installs (LTM-ISS-14):
// npm ci without devDependencies (e.g. Railway) has no husky binary, which
// made the prepare script kill every deploy with exit 127. Only the
// module-not-found case is swallowed — real local install failures stay loud.
try {
  const husky = (await import('husky')).default;
  console.log(husky());
} catch (e) {
  if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e;
  console.log('husky not installed (production/CI install) — skipping git hooks setup');
}
