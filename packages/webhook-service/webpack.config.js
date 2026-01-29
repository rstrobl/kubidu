module.exports = function (options, webpack) {
  return {
    ...options,
    externals: [
      // Mark native modules and heavy dependencies as external
      'cpu-features',
      'ssh2',
      'class-validator',
      'class-transformer',
      /^@nestjs/,
      /^typeorm$/,
      /^bull/,
    ],
    output: {
      ...options.output,
      libraryTarget: 'commonjs2',
    },
  };
};
