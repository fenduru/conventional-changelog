'use strict';

const assert = require(`assert`);
const betterThanBefore = require(`better-than-before`)();
const conventionalRecommendedBump = require(`../`);
const fs = require(`fs`);
const shell = require(`shelljs`);
const temp = require(`temp`);

temp.track();
const preparing = betterThanBefore.preparing;
shell.config.verbose = true;

betterThanBefore.setups([
  () => {
    const tempDirectory = temp.mkdirSync();
    shell.cd(tempDirectory);
    shell.exec(`git init`);
  },
  () => {
    fs.writeFileSync(`test1`, ``);
    shell.exec(`git add --all && git commit -m 'my first commit'`);
  },
  () => {
    shell.exec(`git tag v1.0.0`);
  }
]);

describe(`conventional-recommended-bump API`, () => {
  it(`should throw an error if an options object is not provided`, (done) => {
    assert.throws(() => { conventionalRecommendedBump(); });
    done();
  });

  it(`should return an error if there are no commits in the repository`, (done) => {
    preparing(1);

    conventionalRecommendedBump({}, (err) => {
      assert.ok(err);
      done();
    });
  });

  it(`should return '{}' if no 'whatBump'`, (done) => {
    preparing(2);

    conventionalRecommendedBump({}, (err, releaseType) => {
      assert.deepStrictEqual(releaseType, {});
      done();
    });
  });

  it(`should return '{}' if 'whatBump' returns 'null'`, (done) => {
    preparing(2);

    conventionalRecommendedBump({
      whatBump: () => { return null; }
    }, (err, releaseType) => {
      assert.deepStrictEqual(releaseType, {});
      done();
    });
  })

  it(`should return what is returned by 'whatBump'`, (done) => {
    preparing(2);

    conventionalRecommendedBump({
      whatBump: () => { return {test: `test`}; }
    }, (err, releaseType) => {
      assert.deepStrictEqual(releaseType, {test: `test`});
      done();
    });
  });

  it(`'whatBump' should return a major bump`, (done) => {
    preparing(2);

    conventionalRecommendedBump({
      whatBump: () => { return 0; }
    }, (err, releaseType) => {
      assert.deepStrictEqual(releaseType, {
        level: 0,
        releaseType: 'major'
      });
      done();
    });
  });

  it(`should warn if there is no new commits since last release`, (done) => {
    preparing(3);

    conventionalRecommendedBump({
      warn: (warning) => {
        assert.strictEqual(warning, 'No commits since last release');
        done();
      }
    });
  });
});

