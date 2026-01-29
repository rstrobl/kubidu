module.exports = function (options, webpack) {
  return {
    ...options,
    externals: [
      // Mark native modules as external so webpack doesn't try to bundle them
      'cpu-features',
      'ssh2',
      'dockerode',
      'simple-git',
      /^@nestjs/,
      /^typeorm/,
      /^bull/,
    ],
    output: {
      ...options.output,
      libraryTarget: 'commonjs2',
    },
  };
};
