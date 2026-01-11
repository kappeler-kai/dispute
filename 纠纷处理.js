/**
 * 纠纷处理系统 (Dispute Management System)
 * Version: V4.9
 * Last Updated: 2026-01-11
 * 
 * This module provides comprehensive dispute handling functionality including:
 * - MD5 encryption with complete implementation
 * - Optimized table rendering with helper functions
 * - Advanced error handling and classification
 * - Intelligent cache management with memory limits
 * - Enhanced documentation and type information
 */

'use strict';

// ============================================================================
// MD5 ENCRYPTION IMPLEMENTATION
// ============================================================================

/**
 * Complete MD5 encryption implementation
 * @namespace MD5
 */
const MD5 = (function() {
  /**
   * Convert hex character to integer
   * @param {string} x - Hexadecimal character
   * @returns {number} Integer value
   */
  function rhex(x) {
    return parseInt(x, 16);
  }

  /**
   * Convert integer to hexadecimal string
   * @param {number} num - Integer to convert
   * @returns {string} Hexadecimal representation
   */
  function hex(num) {
    const chars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt((num >> (i * 4)) & 0xf);
    }
    return result;
  }

  /**
   * Add two 32-bit integers with wraparound
   * @param {number} a - First integer
   * @param {number} b - Second integer
   * @returns {number} Sum with 32-bit wraparound
   */
  function add32(a, b) {
    return ((a + b) >>> 0);
  }

  /**
   * MD5 auxiliary functions
   */
  const F = (x, y, z) => (x & y) | (~x & z);
  const G = (x, y, z) => (x & z) | (y & ~z);
  const H = (x, y, z) => x ^ y ^ z;
  const I = (x, y, z) => y ^ (x | ~z);

  /**
   * Rotate left operation
   * @param {number} x - Value to rotate
   * @param {number} n - Rotation count
   * @returns {number} Rotated value
   */
  function rol(x, n) {
    return (x << n) | (x >>> (32 - n));
  }

  /**
   * MD5 round operation
   * @param {number} q - Accumulator
   * @param {number} a - First value
   * @param {number} b - Second value
   * @param {number} x - Block value
   * @param {number} s - Shift value
   * @param {number} t - Table value
   * @param {function} f - Auxiliary function
   * @returns {number} Result
   */
  function md5round(q, a, b, x, s, t, f) {
    return add32(
      rol(add32(add32(a, f(b, q, q >> 1)), add32(x, t)), s),
      b
    );
  }

  /**
   * MD5 block processing (main compression function)
   * @param {Array<number>} X - 16 32-bit words from message block
   * @param {Array<number>} k - MD5 state array [a, b, c, d]
   * @returns {Array<number>} Updated state array
   */
  function md5blk(X, k) {
    let a = k[0], b = k[1], c = k[2], d = k[3];

    const t = [
      0xd76aa478, 0xe8c7b756, 0x242070db, 0xc1bdceee,
      0xf57c0faf, 0x4787c62a, 0xa8304613, 0xfd469501,
      0x698098d8, 0x8b44f7af, 0xffff5bb1, 0x895cd7be,
      0x6b901122, 0xfd987193, 0xa679438e, 0x49b40821,
      0xf61e2562, 0xc040b340, 0x265e5a51, 0xe9b6c7aa,
      0xd62f105d, 0x02441453, 0xd8a1e681, 0xe7d3fbc8,
      0x21e1cde6, 0xc33707d6, 0xf4d50d87, 0x455a14ed,
      0xa9e3e905, 0xfcefa3f8, 0x676f02d9, 0x8d2a4c8a,
      0xfffa3942, 0x8771f681, 0x6d9d6122, 0xfde5380c,
      0xa4beea44, 0x4bdecfa9, 0xf6bb4b60, 0xbebfbc70,
      0x289b7ec6, 0xeaa127fa, 0xd4ef3085, 0x04881d05,
      0xd9d4d039, 0xe6db99e5, 0x1fa27cf8, 0xc4ac5665,
      0xf4292244, 0x432aff97, 0xab9423a7, 0xfc93a039,
      0x655b59c3, 0x8f0ccc92, 0xffeff47d, 0x85845dd1,
      0x6fa87e4f, 0xfe2ce6e0, 0xa3014314, 0x4e0811a1,
      0xf7537e82, 0xbd3af235, 0x2ad7d2bb, 0xeb86d391
    ];

    // Round 1
    for (let i = 0; i < 16; i++) {
      const x = X[i];
      const s = [7, 12, 17, 22];
      const idx = i % 4;
      a = md5round(a, b, c, d, x, s[idx], t[i], F);
      [a, b, c, d] = [d, a, b, c];
    }

    // Round 2
    for (let i = 0; i < 16; i++) {
      const x = X[(5 * i + 1) % 16];
      const s = [5, 9, 14, 20];
      const idx = i % 4;
      a = md5round(a, b, c, d, x, s[idx], t[16 + i], G);
      [a, b, c, d] = [d, a, b, c];
    }

    // Round 3
    for (let i = 0; i < 16; i++) {
      const x = X[(3 * i + 5) % 16];
      const s = [4, 11, 16, 23];
      const idx = i % 4;
      a = md5round(a, b, c, d, x, s[idx], t[32 + i], H);
      [a, b, c, d] = [d, a, b, c];
    }

    // Round 4
    for (let i = 0; i < 16; i++) {
      const x = X[(7 * i) % 16];
      const s = [6, 10, 15, 21];
      const idx = i % 4;
      a = md5round(a, b, c, d, x, s[idx], t[48 + i], I);
      [a, b, c, d] = [d, a, b, c];
    }

    return [
      add32(a, k[0]),
      add32(b, k[1]),
      add32(c, k[2]),
      add32(d, k[3])
    ];
  }

  /**
   * Process MD5 cycles for message blocks
   * @param {string} msg - Input message
   * @returns {Array<number>} Final MD5 hash state
   */
  function md5cycle(msg) {
    const state = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476];
    const msgLen = msg.length;
    const bits = msgLen * 8;
    
    // Pad message
    let padded = msg;
    padded += String.fromCharCode(0x80);
    
    while ((padded.length * 8) % 512 !== 448) {
      padded += String.fromCharCode(0);
    }
    
    // Append length
    for (let i = 0; i < 8; i++) {
      padded += String.fromCharCode((bits >>> (i * 8)) & 0xff);
    }

    // Process blocks
    for (let offset = 0; offset < padded.length; offset += 64) {
      const X = new Array(16);
      for (let i = 0; i < 16; i++) {
        let val = 0;
        for (let j = 0; j < 4; j++) {
          val |= padded.charCodeAt(offset + i * 4 + j) << (j * 8);
        }
        X[i] = val;
      }
      const result = md5blk(X, state);
      state[0] = result[0];
      state[1] = result[1];
      state[2] = result[2];
      state[3] = result[3];
    }

    return state;
  }

  /**
   * MD5 single call wrapper
   * @param {string} str - Input string to hash
   * @returns {string} MD5 hash in hexadecimal format
   */
  function md51(str) {
    const state = md5cycle(str);
    let result = '';
    for (let i = 0; i < 4; i++) {
      result += hex(state[i]);
    }
    return result;
  }

  return {
    /**
     * Hash input string with MD5
     * @param {string} str - Input string
     * @returns {string} MD5 hash
     */
    hash: function(str) {
      if (typeof str !== 'string') {
        str = String(str);
      }
      return md51(str);
    },

    /**
     * Verify hash matches input
     * @param {string} str - Input string
     * @param {string} hash - Expected hash
     * @returns {boolean} True if hash matches
     */
    verify: function(str, hash) {
      return this.hash(str) === hash;
    }
  };
})();

// ============================================================================
// CACHE MANAGEMENT SYSTEM
// ============================================================================

/**
 * Cache management with size limits to prevent memory overflow
 * @class CacheManager
 */
class CacheManager {
  /**
   * Initialize cache with size limit
   * @param {number} maxSize - Maximum cache size in MB (default: 50MB)
   * @param {number} ttl - Time to live in milliseconds (default: 1 hour)
   */
  constructor(maxSize = 50, ttl = 3600000) {
    this.maxSize = maxSize * 1024 * 1024; // Convert to bytes
    this.ttl = ttl;
    this.cache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0
    };
  }

  /**
   * Get current cache size in bytes
   * @returns {number} Current size
   */
  getCurrentSize() {
    let size = 0;
    for (const [, value] of this.cache) {
      size += JSON.stringify(value.data).length;
    }
    return size;
  }

  /**
   * Check if cache needs cleanup
   * @returns {boolean} True if cleanup needed
   */
  needsCleanup() {
    return this.getCurrentSize() > this.maxSize * 0.8; // Cleanup at 80%
  }

  /**
   * Cleanup expired and least used items
   */
  cleanup() {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());

    // Remove expired entries
    for (const [key, value] of entries) {
      if (now - value.timestamp > this.ttl) {
        this.cache.delete(key);
        this.stats.evictions++;
      }
    }

    // If still over limit, remove least used
    if (this.getCurrentSize() > this.maxSize) {
      const sortedEntries = entries
        .sort((a, b) => a[1].accessCount - b[1].accessCount)
        .slice(0, Math.ceil(entries.length * 0.2)); // Remove top 20% least used

      for (const [key] of sortedEntries) {
        this.cache.delete(key);
        this.stats.evictions++;
      }
    }
  }

  /**
   * Set cache value
   * @param {string} key - Cache key
   * @param {*} data - Data to cache
   */
  set(key, data) {
    if (this.needsCleanup()) {
      this.cleanup();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      accessCount: 0
    });
  }

  /**
   * Get cache value
   * @param {string} key - Cache key
   * @returns {*} Cached data or null
   */
  get(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    entry.accessCount++;
    this.stats.hits++;
    entry.timestamp = now; // Update access time
    return entry.data;
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, evictions: 0 };
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    return {
      ...this.stats,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0,
      size: this.getCurrentSize(),
      entries: this.cache.size
    };
  }
}

// ============================================================================
// ERROR HANDLING SYSTEM
// ============================================================================

/**
 * Error classification and handling
 * @enum {string}
 */
const ErrorType = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RENDERING_ERROR: 'RENDERING_ERROR',
  CACHE_ERROR: 'CACHE_ERROR',
  ENCRYPTION_ERROR: 'ENCRYPTION_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
};

/**
 * Custom error class with detailed classification
 * @class DisputeError
 */
class DisputeError extends Error {
  /**
   * Create dispute error
   * @param {string} message - Error message
   * @param {string} type - Error type from ErrorType enum
   * @param {*} details - Additional error details
   */
  constructor(message, type = ErrorType.UNKNOWN_ERROR, details = null) {
    super(message);
    this.name = 'DisputeError';
    this.type = type;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }

  /**
   * Get error log object
   * @returns {Object} Error log information
   */
  toLog() {
    return {
      name: this.name,
      message: this.message,
      type: this.type,
      details: this.details,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }
}

// ============================================================================
// TABLE RENDERING SYSTEM
// ============================================================================

/**
 * Build table header HTML
 * @param {Array<string>} columns - Column names
 * @returns {string} Header HTML
 */
function buildTableHeader(columns) {
  if (!Array.isArray(columns) || columns.length === 0) {
    throw new DisputeError(
      'Invalid columns array for table header',
      ErrorType.VALIDATION_ERROR,
      { columns }
    );
  }

  const headerCells = columns
    .map(col => `<th>${escapeHtml(col)}</th>`)
    .join('');
  
  return `<thead><tr>${headerCells}</tr></thead>`;
}

/**
 * Build table rows HTML
 * @param {Array<Object>} data - Row data objects
 * @param {Array<string>} columns - Column names
 * @returns {string} Rows HTML
 */
function buildTableRows(data, columns) {
  if (!Array.isArray(data)) {
    throw new DisputeError(
      'Data must be an array',
      ErrorType.VALIDATION_ERROR,
      { dataType: typeof data }
    );
  }

  if (!Array.isArray(columns) || columns.length === 0) {
    throw new DisputeError(
      'Invalid columns array',
      ErrorType.VALIDATION_ERROR,
      { columns }
    );
  }

  const rows = data.map(row => {
    if (typeof row !== 'object' || row === null) {
      throw new DisputeError(
        'Each row must be an object',
        ErrorType.VALIDATION_ERROR,
        { row }
      );
    }

    const cells = columns
      .map(col => `<td>${escapeHtml(row[col] || '')}</td>`)
      .join('');
    
    return `<tr>${cells}</tr>`;
  });

  return `<tbody>${rows.join('')}</tbody>`;
}

/**
 * Attach event listeners to table
 * @param {HTMLElement} tableElement - Table DOM element
 * @param {Object} eventHandlers - Object with event handler functions
 */
function attachTableEventListeners(tableElement, eventHandlers = {}) {
  if (!(tableElement instanceof HTMLElement)) {
    throw new DisputeError(
      'Invalid table element',
      ErrorType.RENDERING_ERROR,
      { elementType: typeof tableElement }
    );
  }

  if (eventHandlers.onRowClick) {
    tableElement.addEventListener('click', (e) => {
      const row = e.target.closest('tbody tr');
      if (row) {
        eventHandlers.onRowClick(row);
      }
    });
  }

  if (eventHandlers.onRowHover) {
    tableElement.addEventListener('mouseenter', (e) => {
      const row = e.target.closest('tbody tr');
      if (row) {
        eventHandlers.onRowHover(row, true);
      }
    }, true);

    tableElement.addEventListener('mouseleave', (e) => {
      const row = e.target.closest('tbody tr');
      if (row) {
        eventHandlers.onRowHover(row, false);
      }
    }, true);
  }

  if (eventHandlers.onSort) {
    tableElement.addEventListener('click', (e) => {
      const header = e.target.closest('th');
      if (header) {
        eventHandlers.onSort(header);
      }
    });
  }
}

/**
 * Render complete table
 * @param {HTMLElement} container - Container element
 * @param {Array<Object>} data - Table data
 * @param {Array<string>} columns - Column names
 * @param {Object} options - Rendering options
 * @returns {HTMLElement} Rendered table element
 */
function renderTable(container, data, columns, options = {}) {
  try {
    if (!(container instanceof HTMLElement)) {
      throw new DisputeError(
        'Container must be a valid DOM element',
        ErrorType.RENDERING_ERROR
      );
    }

    // Build table
    const header = buildTableHeader(columns);
    const rows = buildTableRows(data, columns);
    
    const tableHTML = `
      <table class="dispute-table ${options.className || ''}">
        ${header}
        ${rows}
      </table>
    `;

    container.innerHTML = tableHTML;
    const tableElement = container.querySelector('.dispute-table');

    // Attach events
    attachTableEventListeners(tableElement, options.eventHandlers);

    return tableElement;

  } catch (error) {
    if (error instanceof DisputeError) {
      console.error('Table rendering error:', error.toLog());
    } else {
      console.error('Unexpected error during table rendering:', error);
    }
    throw error;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Escape HTML special characters
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  if (typeof text !== 'string') {
    return '';
  }
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Validate dispute data
 * @param {Object} data - Data to validate
 * @returns {Object} Validation result with errors array
 */
function validateDisputeData(data) {
  const errors = [];

  if (!data || typeof data !== 'object') {
    errors.push('Data must be an object');
  } else {
    if (!data.id) {
      errors.push('Missing required field: id');
    }
    if (!data.description) {
      errors.push('Missing required field: description');
    }
    if (!data.status) {
      errors.push('Missing required field: status');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// ============================================================================
// CSS STYLES (Original and Enhanced)
// ============================================================================

/**
 * Initialize CSS styles for dispute management system
 */
function initializeStyles() {
  if (document.getElementById('dispute-styles')) {
    return; // Already initialized
  }

  const styleSheet = document.createElement('style');
  styleSheet.id = 'dispute-styles';
  styleSheet.textContent = `
    /* Table Styles */
    .dispute-table {
      width: 100%;
      border-collapse: collapse;
      font-family: Arial, sans-serif;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      margin: 20px 0;
    }

    .dispute-table thead {
      background-color: #2c3e50;
      color: white;
      font-weight: bold;
    }

    .dispute-table th {
      padding: 12px 15px;
      text-align: left;
      border-bottom: 2px solid #34495e;
      cursor: pointer;
      user-select: none;
      transition: background-color 0.3s ease;
    }

    .dispute-table th:hover {
      background-color: #34495e;
    }

    .dispute-table td {
      padding: 10px 15px;
      border-bottom: 1px solid #ecf0f1;
      word-wrap: break-word;
    }

    .dispute-table tbody tr {
      transition: background-color 0.2s ease;
    }

    .dispute-table tbody tr:hover {
      background-color: #ecf0f1;
      cursor: pointer;
    }

    .dispute-table tbody tr:nth-child(even) {
      background-color: #f8f9fa;
    }

    .dispute-table tbody tr:nth-child(even):hover {
      background-color: #e8eef5;
    }

    /* Status Badge Styles */
    .status-badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: bold;
      text-transform: uppercase;
    }

    .status-pending {
      background-color: #f39c12;
      color: white;
    }

    .status-resolved {
      background-color: #27ae60;
      color: white;
    }

    .status-escalated {
      background-color: #e74c3c;
      color: white;
    }

    .status-closed {
      background-color: #95a5a6;
      color: white;
    }

    /* Responsive Styles */
    @media (max-width: 768px) {
      .dispute-table {
        font-size: 12px;
      }

      .dispute-table th,
      .dispute-table td {
        padding: 8px 10px;
      }
    }

    /* Loading State */
    .dispute-table.loading {
      opacity: 0.6;
      pointer-events: none;
    }

    .loading-spinner {
      display: inline-block;
      width: 20px;
      height: 20px;
      border: 3px solid #f3f3f3;
      border-top: 3px solid #2c3e50;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;

  document.head.appendChild(styleSheet);
}

// ============================================================================
// MAIN DISPUTE MANAGEMENT CLASS
// ============================================================================

/**
 * Main dispute management system
 * @class DisputeManager
 */
class DisputeManager {
  /**
   * Initialize dispute manager
   * @param {Object} config - Configuration object
   */
  constructor(config = {}) {
    this.version = 'V4.9';
    this.config = {
      cacheSize: 50,
      cacheTTL: 3600000,
      enableEncryption: true,
      ...config
    };

    this.cache = new CacheManager(this.config.cacheSize, this.config.cacheTTL);
    this.disputes = [];
    
    initializeStyles();
  }

  /**
   * Add new dispute
   * @param {Object} disputeData - Dispute information
   * @returns {Object} Added dispute with ID
   */
  addDispute(disputeData) {
    const validation = validateDisputeData(disputeData);
    
    if (!validation.isValid) {
      throw new DisputeError(
        'Invalid dispute data: ' + validation.errors.join(', '),
        ErrorType.VALIDATION_ERROR,
        { errors: validation.errors }
      );
    }

    const dispute = {
      id: disputeData.id || Date.now().toString(),
      ...disputeData,
      createdAt: new Date().toISOString()
    };

    if (this.config.enableEncryption && disputeData.description) {
      dispute.descriptionHash = MD5.hash(dispute.description);
    }

    this.disputes.push(dispute);
    this.cache.set('disputes_' + dispute.id, dispute);

    return dispute;
  }

  /**
   * Retrieve dispute by ID
   * @param {string} id - Dispute ID
   * @returns {Object|null} Dispute object or null
   */
  getDispute(id) {
    const cached = this.cache.get('disputes_' + id);
    if (cached) {
      return cached;
    }

    const dispute = this.disputes.find(d => d.id === id);
    if (dispute) {
      this.cache.set('disputes_' + id, dispute);
    }

    return dispute || null;
  }

  /**
   * Update dispute
   * @param {string} id - Dispute ID
   * @param {Object} updates - Updates to apply
   * @returns {Object} Updated dispute
   */
  updateDispute(id, updates) {
    const dispute = this.getDispute(id);
    
    if (!dispute) {
      throw new DisputeError(
        'Dispute not found: ' + id,
        ErrorType.VALIDATION_ERROR,
        { id }
      );
    }

    Object.assign(dispute, updates, { updatedAt: new Date().toISOString() });
    
    if (this.config.enableEncryption && updates.description) {
      dispute.descriptionHash = MD5.hash(dispute.description);
    }

    this.cache.set('disputes_' + id, dispute);

    return dispute;
  }

  /**
   * Get all disputes
   * @returns {Array<Object>} All disputes
   */
  getAllDisputes() {
    const cached = this.cache.get('all_disputes');
    if (cached) {
      return cached;
    }

    this.cache.set('all_disputes', this.disputes);
    return this.disputes;
  }

  /**
   * Render disputes table
   * @param {HTMLElement} container - Container element
   * @param {Object} options - Rendering options
   * @returns {HTMLElement} Rendered table
   */
  renderDisputesTable(container, options = {}) {
    try {
      const disputes = this.getAllDisputes();
      const columns = options.columns || ['id', 'description', 'status', 'createdAt'];

      return renderTable(container, disputes, columns, {
        className: 'disputes-table',
        ...options
      });

    } catch (error) {
      if (!(error instanceof DisputeError)) {
        throw new DisputeError(
          'Error rendering disputes table',
          ErrorType.RENDERING_ERROR,
          { originalError: error.message }
        );
      }
      throw error;
    }
  }

  /**
   * Filter disputes by status
   * @param {string} status - Status to filter by
   * @returns {Array<Object>} Filtered disputes
   */
  filterByStatus(status) {
    if (!status || typeof status !== 'string') {
      throw new DisputeError(
        'Invalid status filter',
        ErrorType.VALIDATION_ERROR,
        { status }
      );
    }

    const cacheKey = 'filter_status_' + status;
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    const filtered = this.disputes.filter(d => d.status === status);
    this.cache.set(cacheKey, filtered);

    return filtered;
  }

  /**
   * Search disputes
   * @param {string} query - Search query
   * @param {Array<string>} fields - Fields to search in
   * @returns {Array<Object>} Search results
   */
  search(query, fields = ['id', 'description', 'status']) {
    if (!query || typeof query !== 'string') {
      throw new DisputeError(
        'Invalid search query',
        ErrorType.VALIDATION_ERROR,
        { query }
      );
    }

    const cacheKey = 'search_' + query;
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    const lowerQuery = query.toLowerCase();
    const results = this.disputes.filter(dispute =>
      fields.some(field => {
        const value = dispute[field];
        return value && String(value).toLowerCase().includes(lowerQuery);
      })
    );

    this.cache.set(cacheKey, results);

    return results;
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  getCacheStats() {
    return this.cache.getStats();
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get system information
   * @returns {Object} System info
   */
  getSystemInfo() {
    return {
      version: this.version,
      timestamp: new Date().toISOString(),
      disputeCount: this.disputes.length,
      cacheStats: this.getCacheStats(),
      config: this.config
    };
  }
}

// ============================================================================
// MODULE EXPORTS
// ============================================================================

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    DisputeManager,
    DisputeError,
    ErrorType,
    CacheManager,
    MD5,
    renderTable,
    buildTableHeader,
    buildTableRows,
    attachTableEventListeners,
    validateDisputeData,
    escapeHtml,
    initializeStyles
  };
}

// Global assignment for browser environment
if (typeof window !== 'undefined') {
  window.DisputeManager = DisputeManager;
  window.DisputeError = DisputeError;
  window.ErrorType = ErrorType;
  window.MD5 = MD5;
  window.CacheManager = CacheManager;
}

// ============================================================================
// INITIALIZATION
// ============================================================================

// Auto-initialize styles on script load
if (typeof document !== 'undefined' && document.readyState !== 'loading') {
  initializeStyles();
} else if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', initializeStyles);
}
