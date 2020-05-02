'use strict'

module.exports = {
  /**
   * @param {Array<string>} filenames
   * @returns {Array<string>}
   */
  '**/*.ts': filenames => {
    const paths = filenames.join(' ')
    return [`prettier-standard ${paths}`, 'tsc', `git add ${paths}`]
  }
}
