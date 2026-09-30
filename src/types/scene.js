/**
 * @typedef {Object} TempleInfo
 * @property {string} name - Name of the temple/mandir
 */

/**
 * @typedef {Object} SiteDimensions
 * @property {'meters' | 'feet'} unit - Active measurement unit
 * @property {number} length - Entered length (along X axis)
 * @property {number} width - Entered width (along Z axis)
 * @property {Array<{x: number, y: number, z: number}>} boundary - Perimeter coordinates
 */

/**
 * @typedef {Object} QueueRequirements
 * @property {number} expectedVisitors - Total daily expected footfall
 * @property {number} peakVisitors - Maximum concurrent visitors inside the crowd space
 */

/**
 * @typedef {Object} SceneState
 * @property {TempleInfo} temple
 * @property {SiteDimensions} site
 * @property {QueueRequirements} requirements
 * @property {Array<any>} components
 * @property {Array<any>} paths
 * @property {Object} analysis
 */
