'use strict';

const { apiCall, buildSiebelHeaders } = require('./client');

function buildScriptsUrl(workspaceName, serviceName) {
  return [
    process.env.SIEBEL_BASE_URL,
    '/siebel/v1.0/workspace/',
    encodeURIComponent(workspaceName),
    '/Business%20Service/',
    encodeURIComponent(serviceName),
    '/Business%20Service%20Server%20Script',
  ].join('');
}

const PAGE_SIZE = 20;

async function fetchAllServiceScripts(workspaceName, serviceName) {
  const allItems = [];
  let page = 1;

  while (true) {
    const url = buildScriptsUrl(workspaceName, serviceName) + `?page=${page}&pagesize=${PAGE_SIZE}`;
    const response = await apiCall({ method: 'GET', url, headers: buildSiebelHeaders() });
    const items = response.items || [];
    allItems.push(...items);

    // stop if Siebel signals last page, or if fewer items returned than requested
    if (response.lastpage === 'true' || items.length < PAGE_SIZE) break;
    page++;
  }

  return allItems;
}

function transformToReviewPayload(workspaceName, items) {
  const activeItems = items.filter(item => item['Inactive'] !== 'Y');
  return {
    workspaceName,
    parentName: activeItems[0]?.['Parent Name'] ?? '',
    scripts: activeItems.map(item => ({
      name: item['Name'],
      body: item['Script'],
    })),
  };
}

module.exports = { buildScriptsUrl, fetchAllServiceScripts, transformToReviewPayload };
