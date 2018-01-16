'use strict';
var concat = require('concat-stream');
var conventionalCommitsFilter = require('conventional-commits-filter');
var conventionalCommitsParser = require('conventional-commits-parser');
var gitSemverTags = require('git-semver-tags');
var gitRawCommits = require('git-raw-commits');
var Q = require('q');

var VERSIONS = ['major', 'minor', 'patch'];

module.exports = conventionalRecommendedBump;

function conventionalRecommendedBump(options, parserOpts, cb) {
  if (typeof options !== 'object') {
    throw new TypeError('options must be an object');
  }

  options = Object.assign({ignoreReverted: true, warn: function() {}}, options);

  cb = typeof parserOpts === 'function' ? cb = parserOpts : cb = cb || noop;

  let presetPackage;
  if (options.preset) {
    try {
      presetPackage = require(`conventional-changelog-${options.preset.toLowerCase()}`);
    } catch (err) {
      return cb(new Error('Preset: "' + options.preset + '" does not exist'));
    }
  } else {
    presetPackage = options.config || {};
  }

  const configPromise = typeof presetPackage === `function` ? Q.nfcall(presetPackage) : new Q(presetPackage);

  configPromise.then((config) => {
    const whatBump = options.whatBump ||
      ((config.recommendedBumpOpts && config.recommendedBumpOpts.whatBump) ? config.recommendedBumpOpts.whatBump :
        noop);

    // TODO: For now we defer to `config.recommendedBumpOpts.parserOpts` if it exists, as our initial refactor
    // efforts created a `parserOpts` object under the `recommendedBumpOpts` object in each preset package.
    // In the future we want to merge differences found in `recommendedBumpOpts.parserOpts` into the top-level
    // `parserOpts` object and remove `recommendedBumpOpts.parserOpts` from each preset package if it exists.
    parserOpts = Object.assign({},
      config.recommendedBumpOpts && config.recommendedBumpOpts.parserOpts ? config.recommendedBumpOpts.parserOpts :
        config.parserOpts,
      parserOpts);

    parserOpts.warn = parserOpts.warn || options.warn;

    gitSemverTags(function(err, tags) {
      if (err) {
        cb(err);
        return;
      }

      gitRawCommits({
        format: '%B%n-hash-%n%H',
        from: tags[0] || '',
        path: options.path
      })
        .pipe(conventionalCommitsParser(parserOpts))
        .pipe(concat(function(data) {
          var commits;

          if (options.ignoreReverted) {
            commits = conventionalCommitsFilter(data);
          } else {
            commits = data;
          }

          if (!commits || !commits.length) {
            options.warn('No commits since last release');
          }

          var result = whatBump(commits);

          if (typeof result === 'number') {
            result = {
              level: result
            };
          }

          if (result && result.level != null) {
            result.releaseType = VERSIONS[result.level];
          } else if (result === null || result === undefined) {
            result = {};
          }

          cb(null, result);
        }));
    }, {lernaTags: !!options.lernaPackage, package: options.lernaPackage});
  });
}

function noop() {}
