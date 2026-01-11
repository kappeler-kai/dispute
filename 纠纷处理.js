// ==UserScript==
// @name         AliExpress 纠纷自动统计和处理 V4.9
// @namespace    http://tampermonkey.net/
// @version      4.9
// @description  增量同步 + 批量标记 + 已处理/未处理筛选 + 聊天弹窗
// @author       Claude
// @match        https://csp.aliexpress.com/m_apps/dispute-management/list*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @connect      seller-acs.aliexpress.com
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    console.log('V4.9 脚本开始加载...');

    // ==================== 样式 ====================
    GM_addStyle(`
        .dispute-manager-btn {
            position: fixed;
            top: 80px;
            right: 20px;
            z-index: 9999;
            background: linear-gradient(135deg, #ff6b35, #f7931e);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            box-shadow: 0 4px 15px rgba(255, 107, 53, 0.4);
            transition: all 0.3s ease;
        }
        .dispute-manager-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(255, 107, 53, 0.5);
        }
        .dispute-panel-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 10000;
            display: none;
        }
        .dispute-panel-overlay.show { display: block; }

        .dispute-panel {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: #fff;
            z-index: 10001;
            display: none;
            flex-direction: column;
            overflow: hidden;
        }
        .dispute-panel.show { display: flex; }

        .panel-header {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            padding: 15px 30px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-shrink: 0;
        }
        .panel-header-left {
            display: flex;
            align-items: center;
            gap: 20px;
        }
        .panel-title { font-size: 18px; font-weight: bold; }
        .today-badge {
            display: flex;
            align-items: center;
            gap: 5px;
            background: rgba(255,255,255,0.2);
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 13px;
        }
        .today-badge .today-count {
            font-weight: bold;
            font-size: 16px;
        }
        .panel-header-actions { display: flex; align-items: center; gap: 12px; }
        .panel-refresh-btn {
            background: rgba(255,255,255,0.2);
            border: none;
            color: white;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
            transition: all 0.3s;
        }
        .panel-refresh-btn:hover { background: rgba(255,255,255,0.3); }
        .panel-refresh-btn.loading { opacity: 0.6; cursor: not-allowed; }
        .panel-close {
            background: rgba(255,255,255,0.2);
            border: none;
            color: white;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 20px;
            transition: all 0.3s;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .panel-close:hover { background: rgba(255,255,255,0.3); }

        .status-bar {
            display: flex;
            align-items: center;
            padding: 8px 30px;
            background: #f8f9fa;
            color: #666;
            font-size: 13px;
            flex-shrink: 0;
            gap: 15px;
            border-bottom: 1px solid #eee;
        }
        .status-bar .status-item { display: flex; align-items: center; gap: 5px; }
        .status-bar .status-divider { width: 1px; height: 16px; background: #ddd; }

        .process-select {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            cursor: pointer;
            border: 1px solid;
            min-width: 75px;
            text-align: center;
        }
        .process-select.unprocessed {
            border-color: #f7931e;
            background: #fff8f0;
            color: #f7931e;
        }
        .process-select.processed {
            border-color: #28a745;
            background: #d4edda;
            color: #28a745;
        }
        .row-processed {
            opacity: 0.6;
            background: #f9f9f9 !important;
        }
        .row-limited {
            background: #fafafa !important;
        }
        .row-limited td {
            color: #999;
        }
        .thumb-placeholder {
            width: 50px;
            height: 50px;
            background: #f0f0f0;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ccc;
            font-size: 20px;
        }

        .batch-checkbox {
            width: 18px;
            height: 18px;
            cursor: pointer;
        }

        .batch-actions-bar {
            display: none;
            padding: 10px 30px;
            background: #fff3cd;
            border-bottom: 1px solid #ffc107;
            align-items: center;
            gap: 15px;
            flex-shrink: 0;
        }
        .batch-actions-bar.show { display: flex; }
        .batch-actions-bar .selected-count { font-weight: 500; color: #856404; }
        .batch-action-btn {
            padding: 6px 15px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            transition: all 0.2s;
        }
        .batch-action-btn.mark-processed {
            background: #28a745;
            color: white;
        }
        .batch-action-btn.mark-processed:hover { background: #1e7e34; }
        .batch-action-btn.mark-unprocessed {
            background: #6c757d;
            color: white;
        }
        .batch-action-btn.mark-unprocessed:hover { background: #545b62; }
        .batch-action-btn.cancel {
            background: #fff;
            color: #666;
            border: 1px solid #ddd;
        }
        .batch-action-btn.cancel:hover { background: #f8f9fa; }

        .sync-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 15000;
            display: none;
            justify-content: center;
            align-items: center;
        }
        .sync-modal.show { display: flex; }
        .sync-modal-content {
            background: white;
            border-radius: 12px;
            width: 400px;
            max-width: 90%;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        }
        .sync-modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px 20px;
            border-bottom: 1px solid #eee;
        }
        .sync-modal-header h3 { margin: 0; font-size: 16px; color: #333; }
        .sync-modal-close {
            background: none;
            border: none;
            font-size: 20px;
            cursor: pointer;
            color: #999;
        }
        .sync-modal-close:hover { color: #333; }
        .sync-modal-body { padding: 20px; }
        .sync-option {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px;
            cursor: pointer;
            border-radius: 6px;
            transition: background 0.2s;
        }
        .sync-option:hover { background: #f8f9fa; }
        .sync-option input[type="radio"] { width: 18px; height: 18px; cursor: pointer; }
        .sync-option input[type="number"] {
            width: 80px;
            padding: 5px 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
        }
        .sync-warning {
            margin-top: 15px;
            padding: 12px;
            background: #fff3cd;
            border-radius: 6px;
            font-size: 12px;
            color: #856404;
            line-height: 1.5;
        }
        .sync-warning-icon { margin-right: 5px; }
        .sync-modal-footer {
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            padding: 15px 20px;
            border-top: 1px solid #eee;
        }
        .sync-modal-btn {
            padding: 8px 20px;
            border-radius: 6px;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s;
        }
        .sync-modal-btn.cancel {
            background: #fff;
            border: 1px solid #ddd;
            color: #666;
        }
        .sync-modal-btn.cancel:hover { background: #f8f9fa; }
        .sync-modal-btn.confirm {
            background: #667eea;
            border: none;
            color: white;
        }
        .sync-modal-btn.confirm:hover { background: #5a6fd6; }

        .filter-container {
            display: flex;
            gap: 12px;
            padding: 15px 30px;
            background: #f8f9fa;
            flex-wrap: wrap;
            flex-shrink: 0;
            align-items: center;
            border-bottom: 1px solid #eee;
        }
        .filter-card {
            background: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            cursor: pointer;
            transition: all 0.3s;
            border: 2px solid transparent;
            min-width: 100px;
            text-align: center;
        }
        .filter-card:hover { transform: translateY(-2px); box-shadow: 0 4px 15px rgba(0,0,0,0.12); }
        .filter-card.active { border-color: #667eea; background: #f0f3ff; }
        .filter-card.disputing { border-left: 4px solid #f7931e; }
        .filter-card.waiting-handle { border-left: 4px solid #dc3545; }
        .filter-card.processed-filter { border-left: 4px solid #28a745; }
        .filter-card.unprocessed-filter { border-left: 4px solid #17a2b8; }
        .filter-number { font-size: 26px; font-weight: bold; color: #333; }
        .filter-label { font-size: 12px; color: #666; margin-top: 3px; }
        .filter-divider {
            width: 1px;
            height: 50px;
            background: #ddd;
            margin: 0 5px;
        }

        .limit-select-wrapper {
            display: flex;
            align-items: center;
            gap: 8px;
            background: white;
            padding: 8px 12px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            font-size: 12px;
            color: #666;
        }
        .limit-select-wrapper select {
            padding: 4px 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 12px;
            cursor: pointer;
        }

        .display-settings {
            margin-left: auto;
            display: flex;
            align-items: center;
            gap: 10px;
            background: white;
            padding: 8px 15px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            flex-wrap: wrap;
        }
        .display-settings-title {
            font-size: 13px;
            color: #666;
            margin-right: 5px;
        }
        .display-checkbox {
            display: flex;
            align-items: center;
            gap: 4px;
            font-size: 12px;
            color: #333;
            cursor: pointer;
            padding: 3px 6px;
            border-radius: 4px;
            transition: background 0.2s;
            white-space: nowrap;
        }
        .display-checkbox:hover { background: #f0f3ff; }
        .display-checkbox input { cursor: pointer; }

        .cache-info {
            font-size: 13px;
            color: #888;
            background: #fff;
            padding: 8px 15px;
            border-radius: 6px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
        .progress-container {
            padding: 12px 30px;
            display: none;
            flex-shrink: 0;
            background: #fff;
            border-bottom: 1px solid #eee;
        }
        .progress-container.show { display: block; }
        .progress-bar-wrapper {
            background: #e9ecef;
            border-radius: 10px;
            height: 6px;
            overflow: hidden;
        }
        .progress-bar {
            background: linear-gradient(135deg, #667eea, #764ba2);
            height: 100%;
            width: 0%;
            transition: width 0.3s ease;
        }
        .progress-text { text-align: center; font-size: 12px; color: #666; margin-top: 6px; }
        .pagination-container {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 6px;
            padding: 12px 30px;
            background: #f8f9fa;
            flex-shrink: 0;
            border-top: 1px solid #eee;
            flex-wrap: wrap;
        }
        .pagination-btn {
            padding: 6px 10px;
            border: 1px solid #ddd;
            background: white;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.3s;
            min-width: 32px;
        }
        .pagination-btn:hover:not(:disabled):not(.active) {
            background: #667eea;
            color: white;
            border-color: #667eea;
        }
        .pagination-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .pagination-btn.active { background: #667eea; color: white; border-color: #667eea; }
        .pagination-info { font-size: 13px; color: #666; margin: 0 8px; }
        .page-size-select { padding: 5px 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px; }
        .table-container { flex: 1; overflow: auto; padding: 15px 20px; }
        .dispute-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .dispute-table th {
            background: #f8f9fa;
            padding: 10px 8px;
            text-align: left;
            font-weight: 600;
            color: #333;
            border-bottom: 2px solid #dee2e6;
            position: sticky;
            top: 0;
            z-index: 10;
            white-space: nowrap;
        }
        .dispute-table td { padding: 10px 8px; border-bottom: 1px solid #eee; vertical-align: top; }
        .dispute-table tr:hover { background: #f8f9fa; }
        .thumb-img {
            width: 55px;
            height: 55px;
            object-fit: cover;
            border-radius: 4px;
            cursor: pointer;
            transition: transform 0.3s;
        }
        .thumb-img:hover { transform: scale(1.1); }

        .evidence-container { position: relative; display: inline-block; }
        .evidence-stack { position: relative; width: 45px; height: 45px; cursor: pointer; }
        .evidence-stack-item {
            position: absolute;
            width: 45px;
            height: 45px;
            object-fit: cover;
            border-radius: 4px;
            border: 2px solid #fff;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        }
        .evidence-stack-item:nth-child(1) { top: 0; left: 0; z-index: 3; }
        .evidence-stack-item:nth-child(2) { top: 3px; left: 3px; z-index: 2; }
        .evidence-stack-item:nth-child(3) { top: 6px; left: 6px; z-index: 1; }
        .evidence-count {
            position: absolute;
            bottom: -5px;
            right: -5px;
            background: #667eea;
            color: white;
            font-size: 10px;
            padding: 2px 5px;
            border-radius: 10px;
            z-index: 10;
        }
        .evidence-single {
            width: 45px;
            height: 45px;
            object-fit: cover;
            border-radius: 4px;
            cursor: pointer;
            border: 1px solid #ddd;
        }
        .evidence-single:hover { transform: scale(1.1); border-color: #667eea; }

        .video-indicator {
            position: relative;
            display: inline-block;
        }
        .video-indicator::after {
            content: '▶';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: white;
            font-size: 14px;
            text-shadow: 0 0 3px rgba(0,0,0,0.8);
            pointer-events: none;
        }
        .video-thumb {
            width: 45px;
            height: 45px;
            object-fit: cover;
            border-radius: 4px;
            cursor: pointer;
            border: 2px solid #ff6b35;
            background: #333;
        }

        .status-tag {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 10px;
            font-size: 11px;
            font-weight: 500;
            white-space: nowrap;
        }
        .status-tag.negotiating { background: #fff3cd; color: #856404; }
        .status-tag.waiting { background: #d1ecf1; color: #0c5460; }
        .status-tag.platform { background: #f8d7da; color: #721c24; }
        .status-tag.finished { background: #d4edda; color: #155724; }

        .lazy-load-btn {
            background: #667eea;
            color: white;
            border: none;
            padding: 5px 10px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
        }
        .lazy-load-btn:hover { background: #5a6fd6; }
        .lazy-load-btn:disabled { background: #ccc; cursor: not-allowed; }
        .lazy-load-btn.loading { background: #ffc107; color: #333; }
        .not-loaded { color: #999; font-size: 12px; font-style: italic; }

        .solution-simple { font-size: 12px; line-height: 1.5; }
        .solution-owner { color: #667eea; font-weight: 500; }
        .solution-type { color: #333; }
        .solution-amount { color: #dc3545; font-weight: bold; }

        .buyer-comment {
            font-size: 12px;
            color: #333;
            max-width: 220px;
            line-height: 1.5;
        }
        .buyer-comment-short {
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }
        .buyer-comment-toggle {
            color: #667eea;
            cursor: pointer;
            font-size: 11px;
            margin-top: 3px;
            display: inline-block;
        }
        .buyer-comment-toggle:hover { text-decoration: underline; }
        .buyer-comment-full { display: none; }
        .buyer-comment-full.show { display: block; }

        .history-container { font-size: 12px; max-width: 300px; }
        .history-item-full {
            padding: 8px;
            background: #f8f9fa;
            border-radius: 4px;
            margin-bottom: 6px;
            border-left: 3px solid #667eea;
        }
        .history-item-full:last-child { margin-bottom: 0; }
        .history-item-full.collapsed { border-left-color: #ddd; }
        .history-time { color: #999; font-size: 11px; margin-bottom: 3px; }
        .history-action-type { color: #333; font-weight: 500; margin-bottom: 4px; }
        .history-detail { color: #666; font-size: 11px; line-height: 1.5; }
        .history-detail-row { margin: 2px 0; }
        .history-detail-label { color: #999; }
        .history-files { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 5px; }
        .history-file-thumb {
            width: 35px;
            height: 35px;
            object-fit: cover;
            border-radius: 3px;
            cursor: pointer;
            border: 1px solid #ddd;
        }
        .history-file-video {
            position: relative;
            display: inline-block;
        }
        .history-file-video::after {
            content: '▶';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: white;
            font-size: 11px;
            text-shadow: 0 0 2px rgba(0,0,0,0.8);
        }
        .history-toggle {
            color: #667eea;
            cursor: pointer;
            font-size: 11px;
            display: inline-block;
            padding: 3px 6px;
            background: #f0f3ff;
            border-radius: 3px;
            margin-top: 5px;
        }
        .history-toggle:hover { background: #e0e6ff; }
        .history-more { display: none; margin-top: 6px; }
        .history-more.show { display: block; }

        .logistics-info { font-size: 11px; }
        .logistics-toggle {
            color: #667eea;
            cursor: pointer;
            font-size: 11px;
            display: inline-block;
            padding: 2px 5px;
            background: #f0f3ff;
            border-radius: 3px;
            margin-top: 4px;
        }
        .logistics-toggle:hover { background: #e0e6ff; }
        .logistics-detail {
            display: none;
            margin-top: 6px;
            padding: 6px;
            background: #f8f9fa;
            border-radius: 4px;
            max-height: 150px;
            overflow-y: auto;
        }
        .logistics-detail.show { display: block; }
        .logistics-item {
            display: flex;
            gap: 6px;
            padding: 3px 0;
            border-bottom: 1px dashed #eee;
            font-size: 11px;
        }
        .logistics-item:last-child { border-bottom: none; }
        .logistics-time { color: #666; white-space: nowrap; min-width: 95px; }
        .logistics-desc { color: #333; }

        .media-preview-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.95);
            z-index: 20000;
            display: none;
            justify-content: center;
            align-items: center;
        }
        .media-preview-modal.show { display: flex; }
        .media-preview-content {
            position: relative;
            max-width: 90%;
            max-height: 90%;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        .media-preview-modal img { max-width: 100%; max-height: 80vh; border-radius: 8px; }
        .media-preview-modal video { max-width: 100%; max-height: 80vh; border-radius: 8px; }
        .media-preview-close {
            position: absolute;
            top: -50px;
            right: -50px;
            color: white;
            font-size: 36px;
            cursor: pointer;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(255,255,255,0.1);
            border-radius: 50%;
        }
        .media-preview-close:hover { background: rgba(255,255,255,0.2); }
        .media-preview-nav {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            background: rgba(255,255,255,0.2);
            color: white;
            border: none;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .media-preview-nav:hover { background: rgba(255,255,255,0.3); }
        .media-preview-nav.prev { left: -70px; }
        .media-preview-nav.next { right: -70px; }
        .media-preview-nav:disabled { opacity: 0.3; cursor: not-allowed; }
        .media-preview-counter {
            color: white;
            font-size: 14px;
            margin-top: 15px;
            padding: 5px 15px;
            background: rgba(255,255,255,0.1);
            border-radius: 15px;
        }

        .data-time { font-size: 10px; white-space: nowrap; padding: 2px 5px; border-radius: 4px; }
        .data-time.fresh { color: #28a745; background: #d4edda; }
        .data-time.medium { color: #856404; background: #fff3cd; }
        .data-time.stale { color: #721c24; background: #f8d7da; }
        .no-data { text-align: center; padding: 60px 20px; color: #999; font-size: 16px; }
        .loading-spinner-inline {
            display: inline-block;
            width: 12px;
            height: 12px;
            border: 2px solid #f3f3f3;
            border-top: 2px solid #667eea;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-right: 5px;
            vertical-align: middle;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

        /* 聊天弹窗样式 */
        .chat-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            z-index: 25000;
            display: none;
            justify-content: center;
            align-items: center;
        }
        .chat-modal.show { display: flex; }
        .chat-modal-content {
            position: relative;
            width: 92%;
            height: 92%;
            max-width: 1400px;
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            display: flex;
            flex-direction: column;
        }
        .chat-modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 20px;
            background: linear-gradient(135deg, #17a2b8, #138496);
            color: white;
            flex-shrink: 0;
        }
        .chat-modal-header h3 { margin: 0; font-size: 15px; font-weight: 500; }
        .chat-modal-header-info { font-size: 12px; opacity: 0.9; margin-left: 15px; }
        .chat-modal-close {
            background: rgba(255,255,255,0.2);
            border: none;
            color: white;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
        }
        .chat-modal-close:hover { background: rgba(255,255,255,0.3); }
        .chat-modal-body { flex: 1; position: relative; overflow: hidden; }
        .chat-modal-body iframe { width: 100%; height: 100%; border: none; }
        .chat-modal-loading {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: #666;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .chat-btn {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            color: #1677ff;
            background: transparent;
            border: none;
            font-size: 12px;
            padding: 4px 8px;
            border-radius: 4px;
            transition: all 0.2s;
            white-space: nowrap;
            cursor: pointer;
        }
        .chat-btn:hover {
            background: rgba(22, 119, 255, 0.08);
            color: #4096ff;
        }
        .chat-icon {
            width: 14px;
            height: 14px;
            fill: currentColor;
        }
    `);

    // ==================== 全局变量 ====================
    let allDisputeData = [];
    let currentFilter = 'all';
    let channelId = '';
    let currentPage = 1;
    let pageSize = 20;
    let totalCount = 0;
    let totalAll = 0;
    let isLoading = false;
    let isFirstOpen = true;

    let statsData = { disputing: 0, waitingHandle: 0 };

    let displaySettings = {
        disputeReason: true,
        solution: true,
        buyerComment: true,
        evidence: true,
        history: true,
        logistics: true
    };
    const DISPLAY_SETTINGS_KEY = 'disputeDisplaySettings_v1';

    const PROCESSED_CACHE_KEY = 'disputeProcessedCache_v1';
    let processedCache = {};

    const LIST_CACHE_KEY = 'disputeListCache_v1';
    let listCache = {
        list: [],
        firstItem: null,
        lastItem: null,
        syncTime: null
    };

    let filteredList = [];
    let isScanning = false;
    let scanAborted = false;

    let selectedItems = new Set();

    let currentPreviewMedia = [];
    let currentPreviewIndex = 0;

    const CACHE_KEY = 'disputeDetailCache_v4';
    const CACHE_EXPIRE_DAYS = 7;
    let detailCache = {};

    // ==================== 缓存管理 ====================
    function loadCacheFromStorage() {
        try {
            const stored = GM_getValue(CACHE_KEY, null);
            if (stored) {
                detailCache = JSON.parse(stored);
                cleanExpiredCache();
                console.log('从存储加载缓存:', Object.keys(detailCache).length, '条');
            } else {
                detailCache = {};
            }
        } catch (e) {
            console.error('加载缓存失败:', e);
            detailCache = {};
        }
    }

    function saveCacheToStorage() {
        try {
            GM_setValue(CACHE_KEY, JSON.stringify(detailCache));
        } catch (e) {
            console.error('保存缓存失败:', e);
        }
    }

    function cleanExpiredCache() {
        const now = Date.now();
        const expireMs = CACHE_EXPIRE_DAYS * 24 * 60 * 60 * 1000;
        let cleanedCount = 0;
        for (const key in detailCache) {
            if (detailCache[key].timestamp && (now - detailCache[key].timestamp) > expireMs) {
                delete detailCache[key];
                cleanedCount++;
            }
        }
        if (cleanedCount > 0) saveCacheToStorage();
    }

    function setCache(reverseOrderLineId, data) {
        detailCache[reverseOrderLineId] = { data: data, timestamp: Date.now() };
        saveCacheToStorage();
    }

    function getCache(reverseOrderLineId) {
        return detailCache[reverseOrderLineId] || null;
    }

    function clearAllCache() {
        detailCache = {};
        saveCacheToStorage();
    }

    function formatCacheTime(timestamp) {
        if (!timestamp) return { text: '-', level: 'stale' };
        const now = Date.now();
        const diffMs = now - timestamp;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 5) return { text: diffMins <= 0 ? '刚刚' : `${diffMins}分钟前`, level: 'fresh' };
        if (diffHours < 5) {
            if (diffMins < 60) return { text: `${diffMins}分钟前`, level: 'medium' };
            return { text: `${diffHours}小时前`, level: 'medium' };
        }
        if (diffHours < 24) return { text: `${diffHours}小时前`, level: 'stale' };
        return { text: `${diffDays}天${diffHours % 24}时前`, level: 'stale' };
    }

    // ==================== 显示设置管理 ====================
    function loadDisplaySettings() {
        try {
            const stored = GM_getValue(DISPLAY_SETTINGS_KEY, null);
            if (stored) {
                displaySettings = { ...displaySettings, ...JSON.parse(stored) };
            }
        } catch (e) {
            console.error('加载显示设置失败:', e);
        }
    }

    function saveDisplaySettings() {
        try {
            GM_setValue(DISPLAY_SETTINGS_KEY, JSON.stringify(displaySettings));
        } catch (e) {
            console.error('保存显示设置失败:', e);
        }
    }

    // ==================== 已处理标记管理 ====================
    function loadProcessedCache() {
        try {
            const stored = GM_getValue(PROCESSED_CACHE_KEY, null);
            if (stored) {
                processedCache = JSON.parse(stored);
                console.log('已处理标记缓存加载:', Object.keys(processedCache).length, '条');
            } else {
                processedCache = {};
            }
        } catch (e) {
            console.error('加载已处理标记失败:', e);
            processedCache = {};
        }
    }

    function saveProcessedCache() {
        try {
            GM_setValue(PROCESSED_CACHE_KEY, JSON.stringify(processedCache));
        } catch (e) {
            console.error('保存已处理标记失败:', e);
        }
    }

    function getProcessedKey(reverseOrderLineId) {
        return reverseOrderLineId;
    }

    function isProcessed(reverseOrderLineId) {
        return processedCache[reverseOrderLineId] === true;
    }

    function markAsProcessed(reverseOrderLineId) {
        processedCache[reverseOrderLineId] = true;
        saveProcessedCache();
        updateFilterCounts();
    }

    function markAsUnprocessed(reverseOrderLineId) {
        delete processedCache[reverseOrderLineId];
        saveProcessedCache();
        updateFilterCounts();
    }

    function toggleProcessed(reverseOrderLineId) {
        if (isProcessed(reverseOrderLineId)) {
            markAsUnprocessed(reverseOrderLineId);
            return false;
        } else {
            markAsProcessed(reverseOrderLineId);
            return true;
        }
    }

    function getProcessedCount() {
        return Object.keys(processedCache).length;
    }

    // ==================== 列表缓存管理 ====================
    function loadListCache() {
        try {
            const stored = GM_getValue(LIST_CACHE_KEY, null);
            if (stored) {
                listCache = JSON.parse(stored);
                console.log('列表缓存加载:', listCache.list.length, '条');
            }
        } catch (e) {
            console.error('加载列表缓存失败:', e);
            listCache = { list: [], firstItem: null, lastItem: null, syncTime: null };
        }
    }

    function saveListCache() {
        try {
            GM_setValue(LIST_CACHE_KEY, JSON.stringify(listCache));
        } catch (e) {
            console.error('保存列表缓存失败:', e);
        }
    }

    function getListCacheKey(item) {
        return item.reverseOrderLineId;
    }

    // ==================== 批量选择管理 ====================
    function toggleSelectItem(reverseOrderLineId) {
        const key = getProcessedKey(reverseOrderLineId);
        if (selectedItems.has(key)) {
            selectedItems.delete(key);
        } else {
            selectedItems.add(key);
        }
        updateBatchActionsBar();
    }

    function selectAllVisible() {
        const dataToRender = getDataToRender();
        let dataToSelect = dataToRender;
        if (currentFilter === 'processed' || currentFilter === 'unprocessed') {
            const startIdx = (currentPage - 1) * pageSize;
            const endIdx = startIdx + pageSize;
            dataToSelect = dataToRender.slice(startIdx, endIdx);
        }
        dataToSelect.forEach(item => {
            const key = getProcessedKey(item.reverseOrderLineId);
            selectedItems.add(key);
        });
        renderTable();
        updateBatchActionsBar();
    }

    function deselectAll() {
        selectedItems.clear();
        renderTable();
        updateBatchActionsBar();
    }

    function batchMarkAsProcessed() {
        selectedItems.forEach(key => {
            processedCache[key] = true;
        });
        saveProcessedCache();
        selectedItems.clear();
        updateBatchActionsBar();
        updateFilterCounts();
        renderTable();
    }

    function batchMarkAsUnprocessed() {
        selectedItems.forEach(key => {
            delete processedCache[key];
        });
        saveProcessedCache();
        selectedItems.clear();
        updateBatchActionsBar();
        updateFilterCounts();
        renderTable();
    }

    function updateBatchActionsBar() {
        const bar = document.getElementById('batchActionsBar');
        const countEl = document.getElementById('selectedCount');
        if (bar && countEl) {
            if (selectedItems.size > 0) {
                bar.classList.add('show');
                countEl.textContent = selectedItems.size;
            } else {
                bar.classList.remove('show');
            }
        }
    }

    // ==================== 工具函数 ====================
    function getChannelId() {
        return new URLSearchParams(window.location.search).get('channelId') || '215374';
    }

    function getToken() {
        const match = document.cookie.match(/_m_h5_tk=([^;]+)/);
        return match ? match[1].split('_')[0] : '';
    }

    function md5(string) {
        function md5cycle(x, k) {
            var a = x[0], b = x[1], c = x[2], d = x[3];
            a = ff(a, b, c, d, k[0], 7, -680876936);d = ff(d, a, b, c, k[1], 12, -389564586);c = ff(c, d, a, b, k[2], 17, 606105819);b = ff(b, c, d, a, k[3], 22, -1044525330);a = ff(a, b, c, d, k[4], 7, -176418897);d = ff(d, a, b, c, k[5], 12, 1200080426);c = ff(c, d, a, b, k[6], 17, -1473231341);b = ff(b, c, d, a, k[7], 22, -45705983);a = ff(a, b, c, d, k[8], 7, 1770035416);d = ff(d, a, b, c, k[9], 12, -1958414417);c = ff(c, d, a, b, k[10], 17, -42063);b = ff(b, c, d, a, k[11], 22, -1990404162);a = ff(a, b, c, d, k[12], 7, 1804603682);d = ff(d, a, b, c, k[13], 12, -40341101);c = ff(c, d, a, b, k[14], 17, -1502002290);b = ff(b, c, d, a, k[15], 22, 1236535329);a = gg(a, b, c, d, k[1], 5, -165796510);d = gg(d, a, b, c, k[6], 9, -1069501632);c = gg(c, d, a, b, k[11], 14, 643717713);b = gg(b, c, d, a, k[0], 20, -373897302);a = gg(a, b, c, d, k[5], 5, -701558691);d = gg(d, a, b, c, k[10], 9, 38016083);c = gg(c, d, a, b, k[15], 14, -660478335);b = gg(b, c, d, a, k[4], 20, -405537848);a = gg(a, b, c, d, k[9], 5, 568446438);d = gg(d, a, b, c, k[14], 9, -1019803690);c = gg(c, d, a, b, k[3], 14, -187363961);b = gg(b, c, d, a, k[8], 20, 1163531501);a = gg(a, b, c, d, k[13], 5, -1444681467);d = gg(d, a, b, c, k[2], 9, -51403784);c = gg(c, d, a, b, k[7], 14, 1735328473);b = gg(b, c, d, a, k[12], 20, -1926607734);a = hh(a, b, c, d, k[5], 4, -378558);d = hh(d, a, b, c, k[8], 11, -2022574463);c = hh(c, d, a, b, k[11], 16, 1839030562);b = hh(b, c, d, a, k[14], 23, -35309556);a = hh(a, b, c, d, k[1], 4, -1530992060);d = hh(d, a, b, c, k[4], 11, 1272893353);c = hh(c, d, a, b, k[7], 16, -155497632);b = hh(b, c, d, a, k[10], 23, -1094730640);a = hh(a, b, c, d, k[13], 4, 681279174);d = hh(d, a, b, c, k[0], 11, -358537222);c = hh(c, d, a, b, k[3], 16, -722521979);b = hh(b, c, d, a, k[6], 23, 76029189);a = hh(a, b, c, d, k[9], 4, -640364487);d = hh(d, a, b, c, k[12], 11, -421815835);c = hh(c, d, a, b, k[15], 16, 530742520);b = hh(b, c, d, a, k[2], 23, -995338651);a = ii(a, b, c, d, k[0], 6, -198630844);d = ii(d, a, b, c, k[7], 10, 1126891415);c = ii(c, d, a, b, k[14], 15, -1416354905);b = ii(b, c, d, a, k[5], 21, -57434055);a = ii(a, b, c, d, k[12], 6, 1700485571);d = ii(d, a, b, c, k[3], 10, -1894986606);c = ii(c, d, a, b, k[10], 15, -1051523);b = ii(b, c, d, a, k[1], 21, -2054922799);a = ii(a, b, c, d, k[8], 6, 1873313359);d = ii(d, a, b, c, k[15], 10, -30611744);c = ii(c, d, a, b, k[6], 15, -1560198380);b = ii(b, c, d, a, k[13], 21, 1309151649);a = ii(a, b, c, d, k[4], 6, -145523070);d = ii(d, a, b, c, k[11], 10, -1120210379);c = ii(c, d, a, b, k[2], 15, 718787259);b = ii(b, c, d, a, k[9], 21, -343485551);x[0] = add32(a, x[0]);x[1] = add32(b, x[1]);x[2] = add32(c, x[2]);x[3] = add32(d, x[3]);
        }
        function cmn(q, a, b, x, s, t) {a = add32(add32(a, q), add32(x, t));return add32((a << s) | (a >>> (32 - s)), b);}
        function ff(a, b, c, d, x, s, t) { return cmn((b & c) | ((~b) & d), a, b, x, s, t); }
        function gg(a, b, c, d, x, s, t) { return cmn((b & d) | (c & (~d)), a, b, x, s, t); }
        function hh(a, b, c, d, x, s, t) { return cmn(b ^ c ^ d, a, b, x, s, t); }
        function ii(a, b, c, d, x, s, t) { return cmn(c ^ (b | (~d)), a, b, x, s, t); }
        function md51(s) {var n = s.length, state = [1732584193, -271733879, -1732584194, 271733878], i;for (i = 64; i <= s.length; i += 64) { md5cycle(state, md5blk(s.substring(i - 64, i))); }s = s.substring(i - 64);var tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];for (i = 0; i < s.length; i++) tail[i >> 2] |= s.charCodeAt(i) << ((i % 4) << 3);tail[i >> 2] |= 0x80 << ((i % 4) << 3);if (i > 55) { md5cycle(state, tail); for (i = 0; i < 16; i++) tail[i] = 0; }tail[14] = n * 8;md5cycle(state, tail);return state;}
        function md5blk(s) {var md5blks = [], i;for (i = 0; i < 64; i += 4) { md5blks[i >> 2] = s.charCodeAt(i) + (s.charCodeAt(i + 1) << 8) + (s.charCodeAt(i + 2) << 16) + (s.charCodeAt(i + 3) << 24); }return md5blks;}
        var hex_chr = '0123456789abcdef'.split('');
        function rhex(n) {var s = '', j = 0;for (; j < 4; j++) s += hex_chr[(n >> (j * 8 + 4)) & 0x0F] + hex_chr[(n >> (j * 8)) & 0x0F];return s;}
        function hex(x) { for (var i = 0; i < x.length; i++) x[i] = rhex(x[i]); return x.join(''); }
        function add32(a, b) { return (a + b) & 0xFFFFFFFF; }
        return hex(md51(string));
    }

    function apiRequest(api, data, method = 'GET') {
        return new Promise((resolve, reject) => {
            const timestamp = Date.now();
            const appKey = '30267743';
            const token = getToken();
            const dataStr = JSON.stringify(data);
            const sign = md5(`${token}&${timestamp}&${appKey}&${dataStr}`);

            let url = `https://seller-acs.aliexpress.com/h5/${api.toLowerCase()}/1.0/?` +
                `jsv=2.7.2&appKey=${appKey}&t=${timestamp}&sign=${sign}&v=1.0&timeout=30000` +
                `&H5Request=true&url=${api}&type=originaljson&method=${method}` +
                `&contentType=application%2Fx-www-form-urlencoded%3Bcharset%3Dutf-8` +
                `&withCredentials=true&__channel-id__=${channelId}&api=${api}` +
                `&dataType=json&valueType=original&x-i18n-regionID=AE`;

            if (method === 'GET') url += `&data=${encodeURIComponent(dataStr)}`;

            GM_xmlhttpRequest({
                method: method,
                url: url,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json',
                    'Origin': 'https://csp.aliexpress.com',
                    'Referer': 'https://csp.aliexpress.com/'
                },
                data: method === 'POST' ? `data=${encodeURIComponent(dataStr)}` : null,
                withCredentials: true,
                onload: function(response) {
                    try {
                        const result = JSON.parse(response.responseText);
                        if (result.ret && result.ret.some(r => r.includes('SUCCESS'))) {
                            resolve(result.data);
                        } else {
                            const errMsg = result.ret ? result.ret[0] : 'Unknown error';
                            if (errMsg.includes('TOKEN_EXOIRED') || errMsg.includes('TOKEN_EXPIRED') || errMsg.includes('令牌过期')) {
                                reject(new Error('登录已过期，请刷新页面后重试'));
                            } else {
                                reject(new Error(errMsg));
                            }
                        }
                    } catch (e) { reject(e); }
                },
                onerror: reject
            });
        });
    }

    // ==================== 数据获取 ====================
    async function fetchDisputeList(page = 1, size = 20, screenItemsStatus = null, sortField = null) {
        const data = {
            "_timezone": -8, "channelId": channelId, "reverseBizType": "1", "reverseStatus": "1",
            "current": page, "pageSize": size, "reverseLineFeatureKey": "all",
            "tradeOrderId": "", "buyerName": "", "itemId": ""
        };
        if (screenItemsStatus) data.screenItemsStatus = screenItemsStatus;
        if (sortField) data.sortField = sortField;
        return await apiRequest('mtop.aliexpress.seller.reverse.querySellerReverseOrderList', data, 'GET');
    }

    async function fetchDisputeStats() {
        try {
            const [allData, disputingData, waitingData] = await Promise.all([
                fetchDisputeList(1, 1, null, null),
                fetchDisputeList(1, 1, '11', null),
                fetchDisputeList(1, 1, '10', 'timeout_trigger')
            ]);
            totalAll = allData?.data?.pageInfo?.total || 0;
            statsData.disputing = disputingData?.data?.pageInfo?.total || 0;
            statsData.waitingHandle = waitingData?.data?.pageInfo?.total || 0;
            updateStatsDisplay();
        } catch (e) {
            console.error('获取统计数据失败:', e);
        }
    }

    async function fetchDisputeDetail(reverseOrderLineId) {
        const data = { "_timezone": -8, "reverseOrderLineId": reverseOrderLineId, "channelId": channelId };
        return await apiRequest('mtop.aliexpress.seller.reverse.reverseOrderLineDetailRender', data, 'GET');
    }

    async function fetchDisputeHistory(reverseOrderLineId) {
        const data = { "_timezone": -8, "reverseOrderLineId": reverseOrderLineId, "channelId": channelId };
        return await apiRequest('mtop.aliexpress.seller.reverse.reverseOrderLineHistoryRender', data, 'GET');
    }

    async function fetchOrderDetail(orderId) {
        const data = { "orderId": orderId, "channelId": channelId, "timezone": "America/Los_Angeles", "_bizLang": "zh_CN", "tradeOrderId": orderId };
        return await apiRequest('mtop.aliexpress.trade.seller.order.detail', data, 'POST');
    }

    // ==================== 数据处理 ====================
    function getStatusClass(status) {
        if (!status) return '';
        if (status.includes('协商') || status.includes('等待买家响应') || status.includes('等待卖家响应')) return 'negotiating';
        if (status.includes('等待') || status.includes('退货')) return 'waiting';
        if (status.includes('平台')) return 'platform';
        if (status.includes('结束') || status.includes('关闭') || status.includes('成功')) return 'finished';
        return '';
    }

    function formatOwner(owner) {
        const map = { 'BUYER': '买家方案', 'SELLER': '卖家方案', 'CUSTOMER_SERVICE': '平台方案', 'SYSTEM': '平台方案' };
        return map[owner] || (owner ? owner + '方案' : '-');
    }

    function formatShippingBearer(bearer) {
        const map = { 'BUYER': '买家承担', 'SELLER': '卖家承担' };
        return map[bearer] || bearer || '';
    }

    function extractLogisticsInfo(orderData) {
        const result = { logisticsMethod: '-', trackingNumber: '-', logisticsDetail: [] };
        if (!orderData || !orderData.data) return result;
        for (const key in orderData.data) {
            if (key.includes('seller_pc_omd_logistics')) {
                const ld = orderData.data[key];
                if (ld.fields && ld.fields.dataSource && ld.fields.dataSource.length > 0) {
                    const first = ld.fields.dataSource[0];
                    result.logisticsMethod = first.logisticsServiceName || '-';
                    result.trackingNumber = first.logisticsNumber || '-';
                    if (first.actionList && first.actionList.logisticDetail) {
                        result.logisticsDetail = first.actionList.logisticDetail;
                    }
                }
                break;
            }
        }
        return result;
    }

    function parseListItem(listItem) {
        const line = listItem.sellerReverseOrderLines[0];
        return {
            orderId: line.tradeOrderId,
            orderTime: line.tradeOrderGmtCreate,
            disputeTime: line.gmtCreate,
            productImage: line.item?.itemPicUrl || '',
            productTitle: line.item?.itemTitle || '',
            disputeStatus: line.reverseStatus,
            buyerName: line.buyer?.fullName || '-',
            buyerCountry: line.buyer?.country || '-',
            contactBuyerUrl: line.buyer?.contactBuyerUrl || '',
            reverseOrderLineId: line.reverseOrderLineId,
            detailLoaded: false,
            cacheTimestamp: null,
            disputeReason: null,
            solution: null,
            buyerComment: null,
            evidenceList: null,
            logisticsMethod: null,
            trackingNumber: null,
            logisticsDetail: null,
            historyList: null
        };
    }

    function applyCacheToItem(item) {
        const cache = getCache(item.reverseOrderLineId);
        if (cache && cache.data) {
            item.detailLoaded = true;
            item.cacheTimestamp = cache.timestamp;
            Object.assign(item, cache.data);
        }
        return item;
    }

    function getRequiredApis() {
        const apis = { needB: false, needC: false, needD: false };
        if (displaySettings.disputeReason || displaySettings.solution ||
            displaySettings.buyerComment || displaySettings.evidence) {
            apis.needB = true;
        }
        if (displaySettings.logistics) {
            apis.needC = true;
        }
        if (displaySettings.history) {
            apis.needD = true;
        }
        return apis;
    }

    async function loadAndCacheDetail(item) {
        try {
            const apis = getRequiredApis();
            const promises = [];

            if (apis.needB) {
                promises.push(fetchDisputeDetail(item.reverseOrderLineId));
            } else {
                promises.push(Promise.resolve(null));
            }

            if (apis.needD) {
                promises.push(fetchDisputeHistory(item.reverseOrderLineId));
            } else {
                promises.push(Promise.resolve(null));
            }

            if (apis.needC) {
                promises.push(fetchOrderDetail(item.orderId));
            } else {
                promises.push(Promise.resolve(null));
            }

            const [detailResult, historyResult, orderResult] = await Promise.all(promises);
            const cacheData = {};

            if (detailResult) {
                const detailData = detailResult.data || detailResult;
                cacheData.disputeStatus = detailData.reverseDetailStatusText || item.disputeStatus;
                cacheData.disputeReason = detailData.applyReason || '-';

                if (detailData.solutions && detailData.solutions.length > 0) {
                    const s = detailData.solutions[0];
                    cacheData.solution = {
                        owner: formatOwner(s.solutionOwner),
                        type: s.solutionTypeText || '-',
                        amount: s.refundMoney?.formatMoney || '-'
                    };
                    cacheData.buyerComment = s.content || '';
                }

                const evidenceList = [];
                if (detailData.evidence?.buyerEvidence) {
                    detailData.evidence.buyerEvidence.forEach(e => {
                        evidenceList.push({
                            type: e.fileType === 'VIDEO' ? 'video' : 'image',
                            url: e.url,
                            fileKey: e.fileKey
                        });
                    });
                }
                cacheData.evidenceList = evidenceList;
            }

            if (historyResult) {
                const historyData = historyResult.data || historyResult || [];
                cacheData.historyList = Array.isArray(historyData) ? historyData.map(h => {
                    const historyItem = {
                        time: h.actionTime,
                        actionType: h.actionType,
                        applyReason: h.applyReason || null,
                        files: (h.files || []).map(f => ({
                            type: f.fileType === 'VIDEO' ? 'video' : 'image',
                            url: f.url
                        })),
                        solutions: []
                    };
                    if (h.processSolutions && h.processSolutions.length > 0) {
                        h.processSolutions.forEach(ps => {
                            historyItem.solutions.push({
                                owner: formatOwner(ps.actionOwner),
                                plan: ps.actionPlan || '',
                                amount: ps.refundMoney?.formatMoney || '',
                                comment: ps.actionComment || '',
                                shippingBearer: formatShippingBearer(ps.shippingFeeBearer)
                            });
                        });
                    }
                    return historyItem;
                }) : [];
            }

            if (orderResult) {
                const logistics = extractLogisticsInfo(orderResult);
                cacheData.logisticsMethod = logistics.logisticsMethod;
                cacheData.trackingNumber = logistics.trackingNumber;
                cacheData.logisticsDetail = logistics.logisticsDetail;
            }

            setCache(item.reverseOrderLineId, cacheData);
            item.detailLoaded = true;
            item.cacheTimestamp = Date.now();
            Object.assign(item, cacheData);
            return item;
        } catch (error) {
            console.error('加载详情失败:', error);
            throw error;
        }
    }

    // ==================== UI 函数 ====================
    function closePanel() {
        document.getElementById('disputePanelOverlay')?.classList.remove('show');
        document.getElementById('disputePanel')?.classList.remove('show');
    }

    function previewMedia(mediaList, startIndex = 0) {
        currentPreviewMedia = mediaList;
        currentPreviewIndex = startIndex;
        showPreviewMedia();
    }

    function showPreviewMedia() {
        const modal = document.getElementById('mediaPreviewModal');
        const container = document.getElementById('mediaPreviewContainer');
        const counter = document.getElementById('mediaPreviewCounter');
        const prevBtn = document.getElementById('mediaPreviewPrev');
        const nextBtn = document.getElementById('mediaPreviewNext');
        if (!modal || !container) return;

        const current = currentPreviewMedia[currentPreviewIndex];
        if (current.type === 'video') {
            container.innerHTML = `<video src="${current.url}" controls autoplay style="max-width:100%;max-height:80vh;border-radius:8px;"></video>`;
        } else {
            container.innerHTML = `<img src="${current.url}" style="max-width:100%;max-height:80vh;border-radius:8px;">`;
        }

        if (counter) {
            counter.textContent = currentPreviewMedia.length > 1 ? `${currentPreviewIndex + 1} / ${currentPreviewMedia.length}` : '';
            counter.style.display = currentPreviewMedia.length > 1 ? 'block' : 'none';
        }
        if (prevBtn) {
            prevBtn.style.display = currentPreviewMedia.length > 1 ? 'flex' : 'none';
            prevBtn.disabled = currentPreviewIndex === 0;
        }
        if (nextBtn) {
            nextBtn.style.display = currentPreviewMedia.length > 1 ? 'flex' : 'none';
            nextBtn.disabled = currentPreviewIndex === currentPreviewMedia.length - 1;
        }
        modal.classList.add('show');
    }

    function prevPreviewMedia() { if (currentPreviewIndex > 0) { currentPreviewIndex--; showPreviewMedia(); } }
    function nextPreviewMedia() { if (currentPreviewIndex < currentPreviewMedia.length - 1) { currentPreviewIndex++; showPreviewMedia(); } }
    function closeMediaPreview() {
        document.getElementById('mediaPreviewModal')?.classList.remove('show');
        const container = document.getElementById('mediaPreviewContainer');
        if (container) container.innerHTML = '';
    }

    // ==================== 聊天弹窗 ====================
    function createChatModal() {
        const chatModal = document.createElement('div');
        chatModal.className = 'chat-modal';
        chatModal.id = 'chatModal';
        chatModal.innerHTML = `
            <div class="chat-modal-content">
                <div class="chat-modal-header">
                    <div style="display:flex;align-items:center;">
                        <h3>💬 联系买家</h3>
                        <span class="chat-modal-header-info" id="chatModalInfo"></span>
                    </div>
                    <div style="display:flex;align-items:center;gap:10px;">
                        <span style="font-size:12px;opacity:0.8;">按 ESC 关闭</span>
                        <button class="chat-modal-close" id="chatModalClose">×</button>
                    </div>
                </div>
                <div class="chat-modal-body">
                    <div class="chat-modal-loading" id="chatLoading">
                        <span class="loading-spinner-inline"></span>
                        <span>正在加载聊天页面...</span>
                    </div>
                    <iframe id="chatIframe" style="opacity:0;transition:opacity 0.3s;"></iframe>
                </div>
            </div>
        `;
        document.body.appendChild(chatModal);

        document.getElementById('chatModalClose').addEventListener('click', closeChatModal);
        chatModal.addEventListener('click', (e) => {
            if (e.target === chatModal) closeChatModal();
        });

        document.getElementById('chatIframe').addEventListener('load', function() {
            const loading = document.getElementById('chatLoading');
            const iframe = document.getElementById('chatIframe');
            if (iframe.src && iframe.src !== 'about:blank') {
                loading.style.display = 'none';
                iframe.style.opacity = '1';
            }
        });
    }

    function openChatModal(contactBuyerUrl, buyerName, buyerCountry, orderId) {
        const modal = document.getElementById('chatModal');
        const iframe = document.getElementById('chatIframe');
        const loading = document.getElementById('chatLoading');
        const info = document.getElementById('chatModalInfo');

        loading.style.display = 'flex';
        iframe.style.opacity = '0';

        info.textContent = `${buyerName} (${buyerCountry}) | 订单: ${orderId}`;

        const fullUrl = contactBuyerUrl.startsWith('http')
            ? contactBuyerUrl
            : `https://csp.aliexpress.com${contactBuyerUrl}&channelId=${channelId}`;

        iframe.src = fullUrl;
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    function closeChatModal() {
        const modal = document.getElementById('chatModal');
        const iframe = document.getElementById('chatIframe');

        modal.classList.remove('show');
        document.body.style.overflow = '';

        setTimeout(() => {
            iframe.src = 'about:blank';
            iframe.style.opacity = '0';
        }, 300);
    }

    function toggleLogistics(id) {
        const detail = document.getElementById('logistics-' + id);
        const toggle = document.getElementById('toggle-' + id);
        if (detail && toggle) {
            const isShow = detail.classList.toggle('show');
            toggle.textContent = isShow ? '▲ 收起' : '▶ 轨迹';
        }
    }

    function toggleHistory(id) {
        const more = document.getElementById('history-more-' + id);
        const toggle = document.getElementById('history-toggle-' + id);
        if (more && toggle) {
            const isShow = more.classList.toggle('show');
            toggle.textContent = isShow ? '▲ 收起' : '▼ 更多';
        }
    }

    function toggleComment(id) {
        const full = document.getElementById('comment-full-' + id);
        const short = document.getElementById('comment-short-' + id);
        const toggle = document.getElementById('comment-toggle-' + id);
        if (full && toggle) {
            const isShow = full.classList.toggle('show');
            toggle.textContent = isShow ? '收起' : '展开';
            if (short) short.style.display = isShow ? 'none' : 'block';
        }
    }

    function updateStatsDisplay() {
        const disputingEl = document.getElementById('statDisputing');
        const waitingEl = document.getElementById('statWaitingHandle');
        const allEl = document.getElementById('statAll');
        if (disputingEl) disputingEl.textContent = statsData.disputing;
        if (waitingEl) waitingEl.textContent = statsData.waitingHandle;
        if (allEl) allEl.textContent = totalAll || '-';
    }

    function updateTodayDisputeCount() {
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        let todayCount = 0;
        allDisputeData.forEach(item => {
            if (item.disputeTime && item.disputeTime.startsWith(todayStr)) {
                todayCount++;
            }
        });
        const todayEl = document.getElementById('todayDisputeCount');
        if (todayEl) todayEl.textContent = todayCount;
    }

    async function loadSingleDetail(reverseOrderLineId) {
        const item = allDisputeData.find(i => i.reverseOrderLineId === reverseOrderLineId);
        if (!item) return;

        const btn = document.getElementById('load-btn-' + reverseOrderLineId);
        if (btn) {
            btn.disabled = true;
            btn.classList.add('loading');
            btn.innerHTML = '<span class="loading-spinner-inline"></span>';
        }

        try {
            await loadAndCacheDetail(item);
            renderTable();
            updateCacheInfo();
            updateLoadAllButtonText();
        } catch (error) {
            if (btn) { btn.disabled = false; btn.classList.remove('loading'); btn.textContent = '重试'; }
            alert('加载失败: ' + error.message);
        }
    }

    async function loadAllPageDetails() {
        if (isLoading) return;
        const dataToRender = getDataToRender();
        if (dataToRender.length === 0) { alert('请先加载列表数据'); return; }

        isLoading = true;
        const loadAllBtn = document.getElementById('loadAllBtn');
        loadAllBtn.classList.add('loading');
        loadAllBtn.textContent = '⏳ 更新中...';

        const progressContainer = document.getElementById('progressContainer');
        progressContainer.classList.add('show');
        updateProgress(0, dataToRender.length, '准备更新详情...');

        const batchSize = 3;
        let loaded = 0;
        for (let i = 0; i < dataToRender.length; i += batchSize) {
            const batch = dataToRender.slice(i, i + batchSize);
            await Promise.all(batch.map(item => loadAndCacheDetail(item).catch(e => console.error(e))));
            loaded = Math.min(i + batchSize, dataToRender.length);
            updateProgress(loaded, dataToRender.length, `更新详情 ${loaded}/${dataToRender.length}`);
        }

        progressContainer.classList.remove('show');
        loadAllBtn.classList.remove('loading');
        updateLoadAllButtonText();
        isLoading = false;
        renderTable();
        updateCacheInfo();
    }

    function updateLoadAllButtonText() {
        const loadAllBtn = document.getElementById('loadAllBtn');
        if (!loadAllBtn) return;
        const dataToRender = getDataToRender();
        const hasLoaded = dataToRender.some(item => item.detailLoaded);
        loadAllBtn.textContent = hasLoaded ? '🔄 更新本页纠纷详情' : '⚡ 加载本页纠纷详情';
    }

    let syncLimit = 500;
    let syncAll = false;

    function showSyncModal() {
        if (syncState.interrupted && syncState.newItems.length > 0) {
            console.log('检测到中断状态，继续同步', syncState);
            syncDisputeList();
            return;
        }
        document.getElementById('syncModalCacheCount').textContent = listCache.list.length;
        document.getElementById('syncModal').classList.add('show');
    }

    function hideSyncModal() {
        document.getElementById('syncModal').classList.remove('show');
    }

    function confirmSync() {
        const allRadio = document.getElementById('syncAllRadio');
        const limitInput = document.getElementById('syncLimitInput');
        const isAllMode = allRadio?.checked === true;
        const limitValue = parseInt(limitInput?.value) || 500;

        syncState = {
            page: 1,
            newItems: [],
            interrupted: false,
            targetLimit: isAllMode ? 0 : limitValue,
            syncMode: null
        };

        clearSyncState();
        hideSyncModal();
        syncDisputeList();
    }

    const SYNC_STATE_KEY = 'disputeSyncState_v1';
    let syncState = {
        page: 1,
        newItems: [],
        interrupted: false,
        targetLimit: 500,
        syncMode: null
    };

    function saveSyncState() {
        try {
            GM_setValue(SYNC_STATE_KEY, JSON.stringify(syncState));
        } catch (e) {
            console.error('保存同步状态失败:', e);
        }
    }

    function loadSyncState() {
        try {
            const saved = GM_getValue(SYNC_STATE_KEY, null);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed && parsed.interrupted && parsed.newItems && parsed.newItems.length > 0) {
                    syncState = parsed;
                    return true;
                }
            }
        } catch (e) {
            console.error('加载同步状态失败:', e);
        }
        return false;
    }

    function clearSyncState() {
        try {
            GM_deleteValue(SYNC_STATE_KEY);
        } catch (e) {
            console.error('清除同步状态失败:', e);
        }
    }

    function resetSyncState() {
        clearSyncState();
        syncState = { page: 1, newItems: [], interrupted: false, targetLimit: 500, syncMode: null };
    }

    async function syncDisputeList() {
        if (isLoading) return;
        isLoading = true;

        const refreshBtn = document.getElementById('refreshBtn');
        const syncStatus = document.getElementById('syncStatus');
        refreshBtn.classList.add('loading');
        refreshBtn.textContent = '⏳ 同步中...';

        const progressContainer = document.getElementById('progressContainer');
        progressContainer.classList.add('show');

        const isResuming = syncState.interrupted && syncState.newItems.length > 0;
        if (isResuming) {
            syncState.interrupted = false;
        }

        try {
            const perPage = 20;
            let hasMore = true;
            let foundExisting = false;
            const isUnlimited = syncState.targetLimit === 0;
            const maxItems = isUnlimited ? Infinity : syncState.targetLimit;
            const currentCacheCount = listCache.list.length;

            let isFullMode, isExpandMode, isIncrementMode;

            if (isResuming && syncState.syncMode) {
                isFullMode = syncState.syncMode === 'full';
                isExpandMode = syncState.syncMode === 'expand';
                isIncrementMode = syncState.syncMode === 'increment';
            } else {
                isFullMode = currentCacheCount === 0;
                isExpandMode = !isUnlimited && currentCacheCount > 0 && maxItems > currentCacheCount;
                isIncrementMode = currentCacheCount > 0 && !isExpandMode;
                syncState.syncMode = isFullMode ? 'full' : (isExpandMode ? 'expand' : 'increment');
            }

            let stopKey = null;

            if (isFullMode) {
                console.log('全量模式：缓存为空，从头开始同步');
            } else if (isExpandMode) {
                if (!isResuming) {
                    syncState.newItems = [...listCache.list];
                    syncState.page = Math.floor(currentCacheCount / perPage) + 1;
                }
            } else if (isIncrementMode) {
                stopKey = listCache.firstItem ? getListCacheKey(listCache.firstItem) : null;
            }

            let totalScanned = (syncState.page - 1) * perPage;

            if (isResuming) {
                updateProgress(syncState.newItems.length, isUnlimited ? 100 : maxItems, `继续同步，已获取 ${syncState.newItems.length} 条...`);
                if (syncStatus) syncStatus.textContent = `继续同步中...`;
            } else if (isExpandMode) {
                updateProgress(syncState.newItems.length, maxItems, `扩展历史数据，已有 ${syncState.newItems.length} 条...`);
                if (syncStatus) syncStatus.textContent = '扩展历史数据中...';
            } else if (isIncrementMode) {
                updateProgress(0, 100, '检查新数据...');
                if (syncStatus) syncStatus.textContent = '检查新数据...';
            } else {
                updateProgress(0, 100, '正在同步纠纷列表...');
                if (syncStatus) syncStatus.textContent = '同步中...';
            }

            while (hasMore && !foundExisting && syncState.newItems.length < maxItems) {
                const listData = await fetchDisputeList(syncState.page, perPage, null, null);
                const disputes = listData.data.dataSource || [];
                const total = listData.data.pageInfo?.total || 0;
                totalCount = total;

                if (disputes.length === 0) {
                    hasMore = false;
                    break;
                }

                for (const dispute of disputes) {
                    const item = parseListItem(dispute);
                    const key = getListCacheKey(item);
                    totalScanned++;

                    if (stopKey && key === stopKey) {
                        foundExisting = true;
                        break;
                    }

                    const isDuplicate = syncState.newItems.some(existing =>
                        getListCacheKey(existing) === key
                    );
                    if (isDuplicate) {
                        continue;
                    }

                    syncState.newItems.push(item);

                    if (syncState.newItems.length >= maxItems) {
                        break;
                    }
                }

                const totalPages = Math.ceil(total / perPage);
                if (syncState.page >= totalPages) {
                    hasMore = false;
                }

                syncState.page++;
                const progressMax = isUnlimited ? total : maxItems;
                updateProgress(Math.min(syncState.newItems.length, progressMax), progressMax, `正在同步第 ${syncState.page} 页，已获取 ${syncState.newItems.length} 条...`);
            }

            if (syncState.newItems.length > 0) {
                if (isIncrementMode && !isExpandMode) {
                    const existingKeys = new Set(listCache.list.map(item => getListCacheKey(item)));
                    const uniqueNewItems = syncState.newItems.filter(item =>
                        !existingKeys.has(getListCacheKey(item))
                    );

                    if (uniqueNewItems.length > 0) {
                        listCache.list = [...uniqueNewItems, ...listCache.list];
                        const firstItem = uniqueNewItems[0];
                        listCache.firstItem = {
                            orderId: firstItem.orderId,
                            disputeTime: firstItem.disputeTime,
                            reverseOrderLineId: firstItem.reverseOrderLineId
                        };
                        listCache.syncTime = Date.now();
                        saveListCache();
                        if (syncStatus) syncStatus.textContent = `新增 ${uniqueNewItems.length} 条纠纷`;
                    } else {
                        if (syncStatus) syncStatus.textContent = '已是最新数据';
                    }
                } else {
                    listCache.list = syncState.newItems;
                    const firstItem = syncState.newItems[0];
                    const lastItem = syncState.newItems[syncState.newItems.length - 1];
                    listCache.firstItem = {
                        orderId: firstItem.orderId,
                        disputeTime: firstItem.disputeTime,
                        reverseOrderLineId: firstItem.reverseOrderLineId
                    };
                    listCache.lastItem = {
                        orderId: lastItem.orderId,
                        disputeTime: lastItem.disputeTime,
                        reverseOrderLineId: lastItem.reverseOrderLineId
                    };
                    listCache.syncTime = Date.now();
                    saveListCache();
                    const actionText = isExpandMode ? '扩展至' : '同步';
                    if (syncStatus) syncStatus.textContent = `已${actionText} ${syncState.newItems.length} 条纠纷`;
                }
            } else if (foundExisting) {
                if (syncStatus) syncStatus.textContent = '已是最新数据';
            } else if (listCache.list.length === 0) {
                if (syncStatus) syncStatus.textContent = '暂无纠纷数据';
            }

            clearSyncState();
            await fetchDisputeStats();
            updateFilterCounts();
            updateListCacheCount();
            applyCurrentFilter();

        } catch (error) {
            console.error('同步失败:', error);
            const errMsg = error.message || '';

            if (syncState.newItems.length > 0) {
                syncState.interrupted = true;
                saveSyncState();
                if (syncStatus) syncStatus.textContent = `已获取 ${syncState.newItems.length} 条，待继续`;

                if (errMsg.includes('刷新页面') || errMsg.includes('验证') || errMsg.includes('过期')) {
                    const continueSync = confirm(
                        `同步被中断，已获取 ${syncState.newItems.length} 条数据。\n\n` +
                        `可能原因：页面需要滑块验证或登录已过期。\n\n` +
                        `请刷新页面完成验证后，重新打开插件点击"继续同步"。\n\n` +
                        `点击"确定"刷新页面，点击"取消"稍后手动刷新。`
                    );
                    if (continueSync) {
                        location.reload();
                        return;
                    }
                } else {
                    alert(`同步出错: ${errMsg}\n\n已保存进度（${syncState.newItems.length}条），可稍后点击"继续同步"。`);
                }
            } else {
                if (syncStatus) syncStatus.textContent = '同步失败';
                alert('同步失败: ' + errMsg);
            }
        }

        setTimeout(() => progressContainer.classList.remove('show'), 500);
        refreshBtn.classList.remove('loading');

        if (syncState.interrupted && syncState.newItems.length > 0) {
            refreshBtn.textContent = '🔄 继续同步';
        } else {
            refreshBtn.textContent = '🔄 同步最新纠纷列表';
        }

        isLoading = false;
    }

    function goToPage(page) {
        const totalPages = Math.ceil(totalCount / pageSize);
        if (page < 1 || page > totalPages || page === currentPage) return;
        currentPage = page;
        loadListOnly();
    }

    async function openPanel() {
        document.getElementById('disputePanelOverlay').classList.add('show');
        document.getElementById('disputePanel').classList.add('show');

        const hasInterrupted = loadSyncState();
        if (hasInterrupted) {
            const refreshBtn = document.getElementById('refreshBtn');
            const syncStatus = document.getElementById('syncStatus');
            if (refreshBtn) refreshBtn.textContent = '🔄 继续同步';
            if (syncStatus) syncStatus.textContent = `上次同步中断，已获取 ${syncState.newItems.length} 条`;
        }

        if (isFirstOpen) {
            isFirstOpen = false;
            await fetchDisputeStats();
            await loadListOnly();
        } else if (allDisputeData.length === 0) {
            await loadListOnly();
        } else {
            renderTable();
        }
        updateLoadAllButtonText();
    }

    async function loadListOnly() {
        if (isLoading) return;
        isLoading = true;

        const progressContainer = document.getElementById('progressContainer');
        const tableContainer = document.getElementById('tableContainer');
        progressContainer.classList.add('show');
        tableContainer.innerHTML = '<div class="no-data">加载中...</div>';
        updateProgress(50, 100, '正在获取纠纷列表...');

        try {
            let screenItemsStatus = null;
            let sortField = null;

            if (currentFilter === 'disputing') {
                screenItemsStatus = '11';
            } else if (currentFilter === 'waiting-handle') {
                screenItemsStatus = '10';
                sortField = 'timeout_trigger';
            }

            const listData = await fetchDisputeList(currentPage, pageSize, screenItemsStatus, sortField);
            const disputes = listData.data.dataSource || [];
            totalCount = listData.data.pageInfo?.total || 0;

            if (disputes.length === 0) {
                tableContainer.innerHTML = '<div class="no-data">暂无纠纷数据</div>';
                progressContainer.classList.remove('show');
                isLoading = false;
                updatePagination();
                return;
            }

            allDisputeData = disputes.map(item => applyCacheToItem(parseListItem(item)));
            updateProgress(100, 100, '加载完成！');
            updateStatsDisplay();
            updateTodayDisputeCount();
            updateFilterCounts();
            updateListCacheCount();
            updatePagination();
            updateCacheInfo();
            updateLoadAllButtonText();
            renderTable();
        } catch (error) {
            console.error('加载失败:', error);
            tableContainer.innerHTML = `<div class="no-data">加载失败: ${error.message}</div>`;
        }

        setTimeout(() => progressContainer.classList.remove('show'), 300);
        isLoading = false;
    }

    function updateProgress(current, total, text) {
        const percentage = Math.round((current / total) * 100);
        const bar = document.getElementById('progressBar');
        const txt = document.getElementById('progressText');
        if (bar) bar.style.width = percentage + '%';
        if (txt) txt.textContent = text;
    }

    function updateCacheInfo() {
        const count = Object.keys(detailCache).length;
        const el = document.getElementById('cacheInfo');
        if (el) el.textContent = count;
    }

    function updatePagination() {
        const totalPages = Math.ceil(totalCount / pageSize);
        const container = document.getElementById('paginationContainer');
        if (!container) return;

        let html = `
            <button class="pagination-btn" ${currentPage === 1 ? 'disabled' : ''} data-page="1">⏮</button>
            <button class="pagination-btn" ${currentPage === 1 ? 'disabled' : ''} data-page="${currentPage - 1}">◀</button>
        `;

        const maxVisible = 5;
        let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        let end = Math.min(totalPages, start + maxVisible - 1);
        if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);

        if (start > 1) html += `<button class="pagination-btn" data-page="1">1</button>`;
        if (start > 2) html += `<span class="pagination-info">...</span>`;
        for (let i = start; i <= end; i++) {
            html += `<button class="pagination-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
        }
        if (end < totalPages - 1) html += `<span class="pagination-info">...</span>`;
        if (end < totalPages) html += `<button class="pagination-btn" data-page="${totalPages}">${totalPages}</button>`;

        html += `
            <button class="pagination-btn" ${currentPage === totalPages ? 'disabled' : ''} data-page="${currentPage + 1}">▶</button>
            <button class="pagination-btn" ${currentPage === totalPages ? 'disabled' : ''} data-page="${totalPages}">⏭</button>
            <span class="pagination-info">|</span>
            <span class="pagination-info">每页</span>
            <select class="page-size-select" id="pageSizeSelect">
                <option value="10" ${pageSize === 10 ? 'selected' : ''}>10条</option>
                <option value="20" ${pageSize === 20 ? 'selected' : ''}>20条</option>
                <option value="50" ${pageSize === 50 ? 'selected' : ''}>50条</option>
            </select>
            <span class="pagination-info">共 ${totalCount} 条</span>
        `;

        container.innerHTML = html;
        container.querySelectorAll('.pagination-btn[data-page]').forEach(btn => {
            btn.addEventListener('click', () => goToPage(parseInt(btn.dataset.page)));
        });
        container.querySelector('#pageSizeSelect')?.addEventListener('change', (e) => {
            pageSize = parseInt(e.target.value);
            currentPage = 1;
            loadListOnly();
        });
    }

    function renderBuyerComment(comment, rowIndex) {
        if (!comment) return '<span style="color:#999">无</span>';
        if (comment.length <= 50) {
            return `<div class="buyer-comment">${comment}</div>`;
        }
        return `
            <div class="buyer-comment">
                <div class="buyer-comment-short" id="comment-short-${rowIndex}">${comment}</div>
                <div class="buyer-comment-full" id="comment-full-${rowIndex}">${comment}</div>
                <span class="buyer-comment-toggle" id="comment-toggle-${rowIndex}" data-comment="${rowIndex}">展开</span>
            </div>
        `;
    }

    function renderEvidence(evidenceList, rowIndex) {
        if (!evidenceList || evidenceList.length === 0) {
            return '<span style="color:#999">无</span>';
        }
        const mediaJson = JSON.stringify(evidenceList).replace(/"/g, '&quot;');
        if (evidenceList.length === 1) {
            const e = evidenceList[0];
            if (e.type === 'video') {
                return `<div class="video-indicator" data-media='${mediaJson}' data-index="0"><img src="https://via.placeholder.com/45x45/333/fff?text=▶" class="video-thumb"></div>`;
            } else {
                return `<img src="${e.url}" class="evidence-single" data-media='${mediaJson}' data-index="0">`;
            }
        }
        let stackHtml = '';
        evidenceList.slice(0, 3).forEach((e, i) => {
            if (e.type === 'video') {
                stackHtml += `<div class="evidence-stack-item" style="background:#333;display:flex;align-items:center;justify-content:center;color:#fff;font-size:16px;">▶</div>`;
            } else {
                stackHtml += `<img src="${e.url}" class="evidence-stack-item">`;
            }
        });
        return `
            <div class="evidence-container" data-media='${mediaJson}'>
                <div class="evidence-stack">
                    ${stackHtml}
                    <span class="evidence-count">${evidenceList.length}</span>
                </div>
            </div>
        `;
    }

    function renderHistory(historyList, rowIndex) {
        if (!historyList || historyList.length === 0) {
            return '<span style="color:#999">无</span>';
        }
        const renderHistoryItem = (h, isFirst) => {
            let html = `<div class="history-item-full ${isFirst ? '' : 'collapsed'}">`;
            html += `<div class="history-time">${h.time}</div>`;
            html += `<div class="history-action-type">${h.actionType}</div>`;
            if (h.applyReason) {
                html += `<div class="history-detail"><span class="history-detail-label">理由：</span>${h.applyReason}</div>`;
            }
            if (h.solutions && h.solutions.length > 0) {
                h.solutions.forEach(s => {
                    html += `<div class="history-detail">`;
                    if (s.owner) html += `<div class="history-detail-row"><span class="history-detail-label">方案人：</span>${s.owner}</div>`;
                    if (s.plan) html += `<div class="history-detail-row"><span class="history-detail-label">方案：</span>${s.plan}</div>`;
                    if (s.amount) html += `<div class="history-detail-row"><span class="history-detail-label">金额：</span><b style="color:#dc3545">${s.amount}</b></div>`;
                    if (s.shippingBearer) html += `<div class="history-detail-row"><span class="history-detail-label">运费：</span>${s.shippingBearer}</div>`;
                    if (s.comment) html += `<div class="history-detail-row"><span class="history-detail-label">备注：</span>${s.comment}</div>`;
                    html += `</div>`;
                });
            }
            if (h.files && h.files.length > 0) {
                const filesJson = JSON.stringify(h.files).replace(/"/g, '&quot;');
                html += `<div class="history-files" data-media='${filesJson}'>`;
                h.files.forEach((f, fi) => {
                    if (f.type === 'video') {
                        html += `<div class="history-file-video" data-index="${fi}"><img src="https://via.placeholder.com/30x30/333/fff?text=▶" class="history-file-thumb"></div>`;
                    } else {
                        html += `<img src="${f.url}" class="history-file-thumb" data-index="${fi}">`;
                    }
                });
                html += `</div>`;
            }
            html += `</div>`;
            return html;
        };

        let html = '<div class="history-container">';
        html += renderHistoryItem(historyList[0], true);
        if (historyList.length > 1) {
            html += `<span class="history-toggle" id="history-toggle-${rowIndex}" data-history="${rowIndex}">▼ 更多 (${historyList.length - 1})</span>`;
            html += `<div class="history-more" id="history-more-${rowIndex}">`;
            historyList.slice(1).forEach(h => {
                html += renderHistoryItem(h, false);
            });
            html += `</div>`;
        }
        html += '</div>';
        return html;
    }

    function renderTable() {
        const tableContainer = document.getElementById('tableContainer');
        const dataToRender = getDataToRender();

        if (dataToRender.length === 0) {
            if (currentFilter === 'processed') {
                tableContainer.innerHTML = '<div class="no-data">没有已处理的纠纷，请先点击"同步最新纠纷列表"</div>';
            } else if (currentFilter === 'unprocessed') {
                tableContainer.innerHTML = '<div class="no-data">没有未处理的纠纷，请先点击"同步最新纠纷列表"</div>';
            } else {
                tableContainer.innerHTML = '<div class="no-data">没有数据</div>';
            }
            return;
        }

        let displayData = dataToRender;
        const isFilteredMode = currentFilter === 'processed' || currentFilter === 'unprocessed';
        if (isFilteredMode) {
            const startIdx = (currentPage - 1) * pageSize;
            const endIdx = startIdx + pageSize;
            displayData = dataToRender.slice(startIdx, endIdx);
        }

        const pageStartIdx = isFilteredMode ? (currentPage - 1) * pageSize : 0;
        const allSelected = displayData.length > 0 && displayData.every(item =>
            selectedItems.has(getProcessedKey(item.reverseOrderLineId))
        );

        let headerHtml = `<tr>
            <th style="width:40px;text-align:center">
                <input type="checkbox" class="batch-checkbox" id="selectAllCheckbox" ${allSelected ? 'checked' : ''}>
            </th>
            <th style="width:85px;text-align:center">处理情况</th>
            <th>产品</th><th>订单号</th><th>纠纷时间</th><th>状态</th>`;
        if (displaySettings.disputeReason) headerHtml += '<th>纠纷理由</th>';
        if (displaySettings.solution) headerHtml += '<th>协商方案</th>';
        if (displaySettings.buyerComment) headerHtml += '<th>买家备注</th>';
        if (displaySettings.evidence) headerHtml += '<th>证据</th>';
        if (displaySettings.history) headerHtml += '<th>纠纷历史</th>';
        if (displaySettings.logistics) headerHtml += '<th>物流</th>';
        headerHtml += '<th>操作</th><th>最后更新</th></tr>';

        let html = `<table class="dispute-table"><thead>${headerHtml}</thead><tbody>`;

        displayData.forEach((item, index) => {
            const globalIdx = pageStartIdx + index;
            const isLimitedRow = isFilteredMode && globalIdx >= 50;

            const statusClass = getStatusClass(item.disputeStatus);
            const isLoaded = item.detailLoaded && !isLimitedRow;
            const timeInfo = formatCacheTime(item.cacheTimestamp);
            const notLoaded = `<span class="not-loaded">-</span>`;
            const limitedInfo = `<span class="not-loaded" title="仅显示前50条的详细信息">-</span>`;
            const processed = isProcessed(item.reverseOrderLineId);
            const rowClass = processed ? 'row-processed' : (isLimitedRow ? 'row-limited' : '');
            const itemKey = getProcessedKey(item.reverseOrderLineId);
            const isSelected = selectedItems.has(itemKey);

            html += `<tr class="${rowClass}">`;

            html += `<td style="text-align:center">
                <input type="checkbox" class="batch-checkbox" data-select-id="${item.reverseOrderLineId}" ${isSelected ? 'checked' : ''}>
            </td>`;

            const selectClass = processed ? 'processed' : 'unprocessed';
            html += `<td style="text-align:center">
                <select class="process-select ${selectClass}" data-process-id="${item.reverseOrderLineId}">
                    <option value="unprocessed" ${!processed ? 'selected' : ''}>未处理</option>
                    <option value="processed" ${processed ? 'selected' : ''}>已处理</option>
                </select>
            </td>`;

            if (isLimitedRow) {
                html += `<td><div class="thumb-placeholder" title="仅显示前50条的图片">-</div></td>`;
            } else {
                html += `<td><img src="${item.productImage}" class="thumb-img" data-preview="${item.productImage}" title="${item.productTitle}"></td>`;
            }

            html += `<td style="font-size:12px;font-weight:500">${item.orderId}</td>`;
            html += `<td style="font-size:12px">${item.disputeTime}</td>`;
            html += `<td><span class="status-tag ${statusClass}">${item.disputeStatus || '-'}</span></td>`;

            if (displaySettings.disputeReason) {
                html += `<td style="font-size:12px">${isLoaded ? (item.disputeReason || '-') : (isLimitedRow ? limitedInfo : notLoaded)}</td>`;
            }

            if (displaySettings.solution) {
                let solutionHtml = isLimitedRow ? limitedInfo : notLoaded;
                if (isLoaded && item.solution) {
                    solutionHtml = `<div class="solution-simple"><div><span class="solution-owner">${item.solution.owner}</span></div><div class="solution-type">${item.solution.type}</div><div class="solution-amount">${item.solution.amount}</div></div>`;
                } else if (isLoaded) {
                    solutionHtml = '<span style="color:#999">无</span>';
                }
                html += `<td>${solutionHtml}</td>`;
            }

            if (displaySettings.buyerComment) {
                html += `<td>${isLoaded ? renderBuyerComment(item.buyerComment, index) : (isLimitedRow ? limitedInfo : notLoaded)}</td>`;
            }

            if (displaySettings.evidence) {
                html += `<td>${isLoaded ? renderEvidence(item.evidenceList, index) : (isLimitedRow ? limitedInfo : notLoaded)}</td>`;
            }

            if (displaySettings.history) {
                html += `<td>${isLoaded ? renderHistory(item.historyList, index) : (isLimitedRow ? limitedInfo : notLoaded)}</td>`;
            }

            if (displaySettings.logistics) {
                let logisticsHtml = notLoaded;
                if (isLoaded) {
                    if (item.logisticsDetail && item.logisticsDetail.length > 0) {
                        logisticsHtml = `
                            <div class="logistics-info">
                                <div>${item.logisticsMethod}</div>
                                <div style="color:#666;font-size:10px;word-break:break-all">${item.trackingNumber}</div>
                                <span class="logistics-toggle" id="toggle-${index}" data-toggle="${index}">▶ 轨迹</span>
                                <div class="logistics-detail" id="logistics-${index}">
                                    ${item.logisticsDetail.map(log => `<div class="logistics-item"><span class="logistics-time">${log.label}</span><span class="logistics-desc">${log.value}</span></div>`).join('')}
                                </div>
                            </div>
                        `;
                    } else {
                        logisticsHtml = `<div class="logistics-info">${item.logisticsMethod || '-'}<br><span style="color:#666;font-size:10px">${item.trackingNumber || '-'}</span></div>`;
                    }
                }
                html += `<td>${logisticsHtml}</td>`;
            }

            // 操作列 - 添加聊天按钮
            let actionHtml = '';
            if (item.contactBuyerUrl) {
                actionHtml += `<button class="chat-btn" data-chat-url="${item.contactBuyerUrl}" data-chat-buyer="${item.buyerName}" data-chat-country="${item.buyerCountry}" data-chat-order="${item.orderId}"><svg class="chat-icon" viewBox="64 64 896 896" xmlns="http://www.w3.org/2000/svg"><path d="M840.704 444.928a246.848 246.848 0 0 1 117.12 209.408c0 38.336-10.176 77.824-28.928 114.688l-0.64 1.088-0.448 1.024 12.8 43.072 0.256 0.64a48.96 48.96 0 0 1-61.504 60.672l-0.64-0.192-39.488-11.712-0.256 0.128-0.64 0.384-0.768 0.384-0.832 0.512-1.216 0.704-1.792 1.088a244.992 244.992 0 0 1-243.904-0.576c27.648-12.16 54.016-27.264 78.656-44.992a173.632 173.632 0 0 0 128-16l0.64-0.384 1.856-1.152 1.408-0.832 0.64-0.384 1.28-0.768 1.28-0.704 0.64-0.384 0.64-0.32 1.28-0.64c4.288-2.304 8.128-3.968 12.544-5.44l0.896-0.32 0.64-0.128a61.056 61.056 0 0 1 35.584-0.384l0.64 0.192 0.832 0.256 2.368 0.64-1.728-5.76-0.192-0.64a57.6 57.6 0 0 1 4.224-46.528l0.32-0.576 0.256-0.448c14.848-27.648 22.976-56.896 23.296-84.288v-1.92c0-44.16-17.152-86.912-47.424-119.168a451.2 451.2 0 0 0 2.304-90.24z m-423.04-318.912c96.704 0 185.856 38.528 251.456 105.6a353.216 353.216 0 0 1 100.864 246.4c0 103.04-40.448 193.344-111.168 258.368a360.576 360.576 0 0 1-241.856 94.592c-60.032 0-123.648-16.384-174.144-46.144l-0.192-0.128-1.536-0.896-1.984-1.28-0.768-0.384-1.088-0.64-1.344-0.768-1.28-0.64-0.896-0.512-1.088-0.64-0.512-0.192-0.64-0.384-0.768-0.32-0.448-0.192-0.64-0.32-0.32-0.128-0.384-0.192-0.384-0.128-0.512-0.192-0.384-0.128-0.32-0.064-0.384-0.128c-0.768-0.256-1.024-0.256-1.664-0.064l-0.768 0.256-0.448 0.128-64 19.008-0.832 0.256a55.68 55.68 0 0 1-70.528-67.712l0.384-1.344a36.032 36.032 0 0 1 0.192-0.768l21.248-71.04a36.032 36.032 0 0 1 0.576-1.664l-0.128 0.384-0.768-1.344C80.64 597.568 64.32 538.112 64 480.64v-1.728A355.2 355.2 0 0 1 163.84 232.96a349.44 349.44 0 0 1 253.824-106.944z m0 72c-78.72 0-149.76 30.848-202.048 84.928a283.264 283.264 0 0 0-79.616 196.032c0 46.08 13.44 95.04 38.4 140.992l-0.384-0.704 0.32 0.576c9.856 16.896 11.392 37.184 5.248 56l-0.192 0.64-0.064 0.256-12.672 42.112 36.48-10.88h0.256c14.976-4.8 29.76-4.672 44.352-0.32l0.768 0.192 1.152 0.384c2.24 0.704 4.48 1.536 6.592 2.368l1.088 0.448 1.088 0.448c1.664 0.704 3.264 1.472 4.928 2.304l1.152 0.576 1.088 0.64 1.152 0.576 0.64 0.256 1.152 0.64 1.216 0.64 1.28 0.768 1.216 0.64 1.28 0.768 1.28 0.768 1.408 0.832 2.048 1.28 1.28 0.64 0.96 0.64c38.592 22.4 88.384 35.264 135.04 35.52h1.408a288.576 288.576 0 0 0 193.152-75.648c56-51.456 87.872-122.624 87.872-205.312A281.216 281.216 0 0 0 617.6 281.92a277.12 277.12 0 0 0-199.936-83.904z m-167.296 240a40.448 40.448 0 1 1-0.064 80.896 40.448 40.448 0 0 1 0.064-80.896z m166.656 0a40.448 40.448 0 1 1-0.128 80.896 40.448 40.448 0 0 1 0.128-80.896z m166.592 0a40.448 40.448 0 1 1-0.128 80.896 40.448 40.448 0 0 1 0.128-80.896z"></path></svg>联系买家</button>`;
            }
            if (!isLoaded) {
                actionHtml += ` <button class="lazy-load-btn" id="load-btn-${item.reverseOrderLineId}" data-load="${item.reverseOrderLineId}">加载</button>`;
            }
            html += `<td>${actionHtml}</td>`;

            // 最后更新时间列
            const updateTimeHtml = isLoaded
                ? `<span class="data-time ${timeInfo.level}">${timeInfo.text}</span>`
                : `<span class="not-loaded">-</span>`;
            html += `<td>${updateTimeHtml}</td>`;

            html += `</tr>`;
        });

        html += '</tbody></table>';
        tableContainer.innerHTML = html;
        tableContainer.addEventListener('click', handleTableClick);
        tableContainer.addEventListener('change', handleTableChange);
    }

    function handleTableChange(e) {
        const target = e.target;

        if (target.id === 'selectAllCheckbox') {
            if (target.checked) {
                selectAllVisible();
            } else {
                deselectAll();
            }
            return;
        }

        if (target.dataset.selectId) {
            toggleSelectItem(target.dataset.selectId);
            return;
        }

        if (target.dataset.processId) {
            const reverseOrderLineId = target.dataset.processId;
            const newValue = target.value;
            const nowProcessed = newValue === 'processed';

            if (nowProcessed) {
                markAsProcessed(reverseOrderLineId);
            } else {
                markAsUnprocessed(reverseOrderLineId);
            }

            target.classList.remove('processed', 'unprocessed');
            target.classList.add(newValue);
            target.closest('tr')?.classList.toggle('row-processed', nowProcessed);

            if (currentFilter === 'unprocessed' && nowProcessed) {
                const idx = filteredList.findIndex(item =>
                    item.reverseOrderLineId === reverseOrderLineId
                );
                if (idx > -1) {
                    filteredList.splice(idx, 1);
                    renderTable();
                }
            } else if (currentFilter === 'processed' && !nowProcessed) {
                const idx = filteredList.findIndex(item =>
                    item.reverseOrderLineId === reverseOrderLineId
                );
                if (idx > -1) {
                    filteredList.splice(idx, 1);
                    renderTable();
                }
            }
            return;
        }
    }

    function handleTableClick(e) {
        const target = e.target;

        // 联系买家按钮
        if (target.dataset.chatUrl) {
            openChatModal(
                target.dataset.chatUrl,
                target.dataset.chatBuyer || '-',
                target.dataset.chatCountry || '-',
                target.dataset.chatOrder || '-'
            );
            return;
        }

        if (target.dataset.preview) {
            previewMedia([{ type: 'image', url: target.dataset.preview }], 0);
            return;
        }

        const mediaContainer = target.closest('[data-media]');
        if (mediaContainer) {
            const mediaList = JSON.parse(mediaContainer.dataset.media);
            const index = parseInt(target.dataset.index) || 0;
            previewMedia(mediaList, index);
            return;
        }

        if (target.dataset.toggle) { toggleLogistics(target.dataset.toggle); return; }
        if (target.dataset.history) { toggleHistory(target.dataset.history); return; }
        if (target.dataset.comment) { toggleComment(target.dataset.comment); return; }
        if (target.dataset.load) { loadSingleDetail(target.dataset.load); return; }
    }

    function handleDisplaySettingChange(key) {
        const checkbox = document.getElementById('display-' + key);
        if (checkbox) {
            displaySettings[key] = checkbox.checked;
            saveDisplaySettings();
            renderTable();
        }
    }

    // ==================== 筛选功能 ====================
    function getDataToRender() {
        if (currentFilter === 'processed' || currentFilter === 'unprocessed') {
            return filteredList;
        }
        return allDisputeData;
    }

    function updateFilterCounts() {
        let processedCount = 0;
        let unprocessedCount = 0;

        listCache.list.forEach(item => {
            if (isProcessed(item.reverseOrderLineId)) {
                processedCount++;
            } else {
                unprocessedCount++;
            }
        });

        const processedEl = document.getElementById('statProcessed');
        const unprocessedEl = document.getElementById('statUnprocessed');
        if (processedEl) processedEl.textContent = processedCount;
        if (unprocessedEl) unprocessedEl.textContent = unprocessedCount;
        updateProcessedCountBadge();
    }

    async function applyCurrentFilter() {
        if (currentFilter === 'processed' || currentFilter === 'unprocessed') {
            await scanFilteredDisputes();
        } else {
            await loadListOnly();
        }
    }

    async function scanFilteredDisputes() {
        if (isScanning) {
            scanAborted = true;
            return;
        }

        isScanning = true;
        scanAborted = false;
        filteredList = [];

        const isFilterProcessed = currentFilter === 'processed';
        const progressContainer = document.getElementById('progressContainer');
        const syncStatus = document.getElementById('syncStatus');
        progressContainer.classList.add('show');

        try {
            if (listCache.list.length > 0) {
                if (syncStatus) syncStatus.textContent = '从缓存筛选中...';

                for (const item of listCache.list) {
                    const itemProcessed = isProcessed(item.reverseOrderLineId);
                    if ((isFilterProcessed && itemProcessed) || (!isFilterProcessed && !itemProcessed)) {
                        const fullItem = applyCacheToItem({ ...item });
                        filteredList.push(fullItem);
                    }
                }
                if (syncStatus) syncStatus.textContent = `找到 ${filteredList.length} 条`;
            } else {
                if (syncStatus) syncStatus.textContent = '请先点击同步按钮';
            }

            renderTable();
            updatePaginationForFiltered();

        } catch (error) {
            console.error('筛选失败:', error);
            if (syncStatus) syncStatus.textContent = '筛选出错';
        }

        isScanning = false;
        scanAborted = false;
        setTimeout(() => progressContainer.classList.remove('show'), 300);
    }

    function updatePaginationForFiltered() {
        const container = document.getElementById('paginationContainer');
        if (!container) return;

        if (currentFilter === 'processed' || currentFilter === 'unprocessed') {
            const totalFiltered = filteredList.length;
            const totalPages = Math.ceil(totalFiltered / pageSize);
            const displayPage = Math.min(currentPage, totalPages) || 1;

            let html = `
                <button class="pagination-btn" ${displayPage === 1 ? 'disabled' : ''} data-page="1">⏮</button>
                <button class="pagination-btn" ${displayPage === 1 ? 'disabled' : ''} data-page="${displayPage - 1}">◀</button>
            `;

            const maxVisible = 5;
            let start = Math.max(1, displayPage - Math.floor(maxVisible / 2));
            let end = Math.min(totalPages, start + maxVisible - 1);
            if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);

            if (totalPages > 0) {
                if (start > 1) html += `<button class="pagination-btn" data-page="1">1</button>`;
                if (start > 2) html += `<span class="pagination-info">...</span>`;
                for (let i = start; i <= end; i++) {
                    html += `<button class="pagination-btn ${i === displayPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
                }
                if (end < totalPages - 1) html += `<span class="pagination-info">...</span>`;
                if (end < totalPages) html += `<button class="pagination-btn" data-page="${totalPages}">${totalPages}</button>`;
            }

            html += `
                <button class="pagination-btn" ${displayPage === totalPages || totalPages === 0 ? 'disabled' : ''} data-page="${displayPage + 1}">▶</button>
                <button class="pagination-btn" ${displayPage === totalPages || totalPages === 0 ? 'disabled' : ''} data-page="${totalPages}">⏭</button>
                <span class="pagination-info">|</span>
                <span class="pagination-info">每页</span>
                <select class="page-size-select" id="pageSizeSelect">
                    <option value="10" ${pageSize === 10 ? 'selected' : ''}>10条</option>
                    <option value="20" ${pageSize === 20 ? 'selected' : ''}>20条</option>
                    <option value="50" ${pageSize === 50 ? 'selected' : ''}>50条</option>
                    <option value="100" ${pageSize === 100 ? 'selected' : ''}>100条</option>
                    <option value="300" ${pageSize === 300 ? 'selected' : ''}>300条</option>
                    <option value="500" ${pageSize === 500 ? 'selected' : ''}>500条</option>
                </select>
                <span class="pagination-info">共 ${totalFiltered} 条</span>
            `;

            container.innerHTML = html;

            container.querySelectorAll('.pagination-btn[data-page]').forEach(btn => {
                btn.addEventListener('click', () => {
                    currentPage = parseInt(btn.dataset.page);
                    selectedItems.clear();
                    updateBatchActionsBar();
                    renderTable();
                    updatePaginationForFiltered();
                });
            });
            container.querySelector('#pageSizeSelect')?.addEventListener('change', (e) => {
                pageSize = parseInt(e.target.value);
                currentPage = 1;
                selectedItems.clear();
                updateBatchActionsBar();
                renderTable();
                updatePaginationForFiltered();
            });
        } else {
            updatePagination();
        }
    }

    async function filterByType(filterType) {
        currentFilter = filterType;
        currentPage = 1;
        selectedItems.clear();
        updateBatchActionsBar();

        document.querySelectorAll('.filter-card').forEach(card => {
            card.classList.toggle('active', card.dataset.filter === filterType);
        });

        await applyCurrentFilter();
    }

    function createUI() {
        const btn = document.createElement('button');
        btn.className = 'dispute-manager-btn';
        btn.innerHTML = '📊 纠纷统计面板';
        btn.addEventListener('click', openPanel);
        document.body.appendChild(btn);

        const overlay = document.createElement('div');
        overlay.className = 'dispute-panel-overlay';
        overlay.id = 'disputePanelOverlay';
        overlay.addEventListener('click', (e) => { if (e.target === overlay) closePanel(); });
        document.body.appendChild(overlay);

        const panel = document.createElement('div');
        panel.className = 'dispute-panel';
        panel.id = 'disputePanel';
        panel.innerHTML = `
            <div class="panel-header">
                <div class="panel-header-left">
                    <div class="panel-title">📊 纠纷统计与管理面板 V4.9</div>
                    <div class="today-badge">
                        <span>📅 今日新增:</span>
                        <span class="today-count" id="todayDisputeCount">0</span>
                        <span>条</span>
                    </div>
                </div>
                <div class="panel-header-actions">
                    <button class="panel-refresh-btn" id="refreshBtn">🔄 同步最新纠纷列表</button>
                    <button class="panel-refresh-btn" id="loadAllBtn">⚡ 获取本页详情</button>
                    <button class="panel-refresh-btn" id="clearCacheBtn">🗑️ 清除缓存</button>
                    <button class="panel-close" id="panelCloseBtn">×</button>
                </div>
            </div>
            <div class="status-bar">
                <span class="status-item" id="syncStatus">点击同步按钮获取数据</span>
                <span class="status-divider"></span>
                <span class="status-item">💾 已同步 <b id="listCacheCount">0</b> 条</span>
                <span class="status-divider"></span>
                <span class="status-item">✓ 已标记 <b id="processedCountBadge">0</b> 条已处理</span>
                <span class="status-divider"></span>
                <span class="status-item">📦 详情缓存 <b id="cacheInfo">0</b> 条 (保留7天)</span>
            </div>
            <div class="batch-actions-bar" id="batchActionsBar">
                <span class="selected-count">已选择 <span id="selectedCount">0</span> 条</span>
                <button class="batch-action-btn mark-processed" id="batchMarkProcessed">✓ 批量标记已处理</button>
                <button class="batch-action-btn mark-unprocessed" id="batchMarkUnprocessed">○ 批量取消标记</button>
                <button class="batch-action-btn cancel" id="batchCancel">取消选择</button>
            </div>
            <div class="filter-container">
                <div class="filter-card active" data-filter="all">
                    <div class="filter-number" id="statAll">-</div>
                    <div class="filter-label">全部</div>
                </div>
                <div class="filter-card disputing" data-filter="disputing">
                    <div class="filter-number" id="statDisputing">-</div>
                    <div class="filter-label">纠纷中</div>
                </div>
                <div class="filter-card waiting-handle" data-filter="waiting-handle">
                    <div class="filter-number" id="statWaitingHandle">-</div>
                    <div class="filter-label">等待您处理</div>
                </div>
                <span class="filter-divider"></span>
                <div class="filter-card processed-filter" data-filter="processed">
                    <div class="filter-number" id="statProcessed">-</div>
                    <div class="filter-label">已处理</div>
                </div>
                <div class="filter-card unprocessed-filter" data-filter="unprocessed">
                    <div class="filter-number" id="statUnprocessed">-</div>
                    <div class="filter-label">未处理</div>
                </div>
                <div class="display-settings">
                    <span class="display-settings-title">显示列：</span>
                    <label class="display-checkbox"><input type="checkbox" id="display-disputeReason" ${displaySettings.disputeReason ? 'checked' : ''}>纠纷理由</label>
                    <label class="display-checkbox"><input type="checkbox" id="display-solution" ${displaySettings.solution ? 'checked' : ''}>协商方案</label>
                    <label class="display-checkbox"><input type="checkbox" id="display-buyerComment" ${displaySettings.buyerComment ? 'checked' : ''}>买家备注</label>
                    <label class="display-checkbox"><input type="checkbox" id="display-evidence" ${displaySettings.evidence ? 'checked' : ''}>证据</label>
                    <label class="display-checkbox"><input type="checkbox" id="display-history" ${displaySettings.history ? 'checked' : ''}>纠纷历史</label>
                    <label class="display-checkbox"><input type="checkbox" id="display-logistics" ${displaySettings.logistics ? 'checked' : ''}>物流</label>
                </div>
            </div>
            <div class="progress-container" id="progressContainer">
                <div class="progress-bar-wrapper"><div class="progress-bar" id="progressBar"></div></div>
                <div class="progress-text" id="progressText">准备中...</div>
            </div>
            <div class="table-container" id="tableContainer"><div class="no-data">点击"同步最新纠纷列表"按钮获取数据</div></div>
            <div class="pagination-container" id="paginationContainer"></div>
        `;
        document.body.appendChild(panel);

        const syncModal = document.createElement('div');
        syncModal.className = 'sync-modal';
        syncModal.id = 'syncModal';
        syncModal.innerHTML = `
            <div class="sync-modal-content">
                <div class="sync-modal-header">
                    <h3>🔄 同步纠纷列表</h3>
                    <button class="sync-modal-close" id="syncModalClose">×</button>
                </div>
                <div class="sync-modal-body">
                    <div class="sync-option">
                        <input type="radio" name="syncType" id="syncLimitRadio" value="limit" checked>
                        <label for="syncLimitRadio">同步前</label>
                        <input type="number" id="syncLimitInput" value="500" min="1" max="9999">
                        <label for="syncLimitRadio">条</label>
                    </div>
                    <div class="sync-option">
                        <input type="radio" name="syncType" id="syncAllRadio" value="all">
                        <label for="syncAllRadio">同步全部</label>
                    </div>
                    <div class="sync-warning">
                        <span class="sync-warning-icon">⚠️</span>
                        <span>当前已缓存 <b id="syncModalCacheCount">0</b> 条数据。</span><br>
                        <span>如果纠纷数量较大，不建议选择"全部"，建议只同步前500条以保证性能。</span>
                    </div>
                </div>
                <div class="sync-modal-footer">
                    <button class="sync-modal-btn cancel" id="syncModalCancel">取消</button>
                    <button class="sync-modal-btn confirm" id="syncModalConfirm">开始同步</button>
                </div>
            </div>
        `;
        document.body.appendChild(syncModal);

        document.getElementById('panelCloseBtn').addEventListener('click', closePanel);
        document.getElementById('refreshBtn').addEventListener('click', showSyncModal);
        document.getElementById('loadAllBtn').addEventListener('click', loadAllPageDetails);
        document.getElementById('clearCacheBtn').addEventListener('click', () => {
            if (confirm('确定清除所有缓存？这将清除详情缓存、列表缓存和已处理标记。')) {
                clearAllCache();
                listCache = { list: [], firstItem: null, lastItem: null, syncTime: null };
                saveListCache();
                processedCache = {};
                saveProcessedCache();
                clearSyncState();
                syncState = { page: 1, newItems: [], interrupted: false, targetLimit: 500, syncMode: null };
                const refreshBtn = document.getElementById('refreshBtn');
                if (refreshBtn) {
                    refreshBtn.textContent = '🔄 同步最新纠纷列表';
                    refreshBtn.classList.remove('loading');
                }
                const syncStatus = document.getElementById('syncStatus');
                if (syncStatus) {
                    syncStatus.textContent = '未同步';
                }
                updateCacheInfo();
                updateListCacheCount();
                updateProcessedCountBadge();
                updateFilterCounts();
                allDisputeData = [];
                filteredList = [];
                renderTable();
            }
        });

        document.getElementById('syncModalClose').addEventListener('click', hideSyncModal);
        document.getElementById('syncModalCancel').addEventListener('click', hideSyncModal);
        document.getElementById('syncModalConfirm').addEventListener('click', confirmSync);
        document.getElementById('syncModal').addEventListener('click', (e) => {
            if (e.target.id === 'syncModal') hideSyncModal();
        });

        document.querySelectorAll('.filter-card').forEach(card => {
            card.addEventListener('click', () => filterByType(card.dataset.filter));
        });

        ['disputeReason', 'solution', 'buyerComment', 'evidence', 'history', 'logistics'].forEach(key => {
            document.getElementById('display-' + key)?.addEventListener('change', () => handleDisplaySettingChange(key));
        });

        document.getElementById('batchMarkProcessed')?.addEventListener('click', batchMarkAsProcessed);
        document.getElementById('batchMarkUnprocessed')?.addEventListener('click', batchMarkAsUnprocessed);
        document.getElementById('batchCancel')?.addEventListener('click', deselectAll);

        const mediaModal = document.createElement('div');
        mediaModal.className = 'media-preview-modal';
        mediaModal.id = 'mediaPreviewModal';
        mediaModal.innerHTML = `
            <div class="media-preview-content">
                <span class="media-preview-close" id="mediaPreviewClose">×</span>
                <button class="media-preview-nav prev" id="mediaPreviewPrev">◀</button>
                <div id="mediaPreviewContainer"></div>
                <button class="media-preview-nav next" id="mediaPreviewNext">▶</button>
                <div class="media-preview-counter" id="mediaPreviewCounter"></div>
            </div>
        `;
        document.body.appendChild(mediaModal);

        document.getElementById('mediaPreviewClose').addEventListener('click', closeMediaPreview);
        document.getElementById('mediaPreviewPrev').addEventListener('click', prevPreviewMedia);
        document.getElementById('mediaPreviewNext').addEventListener('click', nextPreviewMedia);
        mediaModal.addEventListener('click', (e) => { if (e.target === mediaModal) closeMediaPreview(); });

        // 创建聊天弹窗
        createChatModal();

        // ESC 键统一处理
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (document.getElementById('chatModal')?.classList.contains('show')) {
                    closeChatModal();
                    return;
                }
                if (document.getElementById('mediaPreviewModal')?.classList.contains('show')) {
                    closeMediaPreview();
                    return;
                }
                if (document.getElementById('syncModal')?.classList.contains('show')) {
                    hideSyncModal();
                    return;
                }
            }
            if (document.getElementById('mediaPreviewModal')?.classList.contains('show')) {
                if (e.key === 'ArrowLeft') prevPreviewMedia();
                if (e.key === 'ArrowRight') nextPreviewMedia();
            }
        });
    }

    function updateProcessedCountBadge() {
        const el = document.getElementById('processedCountBadge');
        if (el) el.textContent = getProcessedCount();
    }

    function updateListCacheCount() {
        const el = document.getElementById('listCacheCount');
        if (el) el.textContent = listCache.list.length;
    }

    function init() {
        channelId = getChannelId();
        loadCacheFromStorage();
        loadDisplaySettings();
        loadProcessedCache();
        loadListCache();
        createUI();

// 插入样式
if (!document.getElementById('cainiaoTrackingStyle')) {
    const style = document.createElement('style');
    style.id = 'cainiaoTrackingStyle';
    style.textContent = `
.cainiao-tracking-container {
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    padding: 12px;
    background: #fafbfc;
    font-size: 14px;
    margin: 8px 0;
    max-width: 420px;
}
.cainiao-tracking-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
}
.cainiao-tracking-latest {
    font-weight: bold;
    color: #1a73e8;
}
.cainiao-tracking-toggle {
    background: none;
    border: none;
    color: #1a73e8;
    cursor: pointer;
    font-size: 13px;
    padding: 0 6px;
}
.cainiao-tracking-list {
    margin-top: 10px;
    display: none;
    flex-direction: column;
    gap: 6px;
}
.cainiao-tracking-list.show {
    display: flex;
}
.cainiao-tracking-item {
    padding: 6px 8px;
    border-radius: 4px;
    transition: background 0.2s;
}
.cainiao-tracking-item:hover {
    background: #f0f4f8;
}
.cainiao-tracking-time {
    color: #888;
    font-size: 12px;
    margin-right: 8px;
}
.cainiao-tracking-desc {
    color: #222;
}
    `;
    document.head.appendChild(style);
}

// 插入容器
if (!document.getElementById('cainiaoTrackingRoot')) {
    const div = document.createElement('div');
    div.id = 'cainiaoTrackingRoot';
    document.body.appendChild(div); // 或插入到你想要的位置
}

// 示例轨迹数据，实际请替换为你的数据
const detailList = [
    { "timeStr": "2025-12-18 11:26:10", "standerdDesc": "集货仓出库成功" },
    { "timeStr": "2025-12-17 10:01:38", "standerdDesc": "仓库入库成功" }
];
renderCainiaoTracking(detailList, 'cainiaoTrackingRoot');

// 渲染轨迹函数
function renderCainiaoTracking(detailList, containerId) {
    if (!detailList || !detailList.length) return;
    const container = document.getElementById(containerId);
    if (!container) return;

    const latest = detailList[0];
    let html = `
    <div class="cainiao-tracking-container">
        <div class="cainiao-tracking-header">
            <span class="cainiao-tracking-latest">
                <span class="cainiao-tracking-time">${latest.timeStr}</span>
                <span class="cainiao-tracking-desc">${latest.standerdDesc}</span>
            </span>
            <button class="cainiao-tracking-toggle" type="button">展开</button>
        </div>
        <div class="cainiao-tracking-list">
            ${detailList.map(item => `
                <div class="cainiao-tracking-item">
                    <span class="cainiao-tracking-time">${item.timeStr}</span>
                    <span class="cainiao-tracking-desc">${item.standerdDesc}</span>
                </div>
            `).join('')}
        </div>
    </div>
    `;
    container.innerHTML = html;

    const toggleBtn = container.querySelector('.cainiao-tracking-toggle');
    const trackingList = container.querySelector('.cainiao-tracking-list');
    let expanded = false;
    toggleBtn.onclick = function() {
        expanded = !expanded;
        if (expanded) {
            trackingList.classList.add('show');
            toggleBtn.textContent = '收起';
        } else {
            trackingList.classList.remove('show');
            toggleBtn.textContent = '展开';
        }
    };
}
        updateCacheInfo();
        updateProcessedCountBadge();
        updateListCacheCount();
        updateFilterCounts();
        console.log('V4.9 已加载');

    
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 100);
    }
})();