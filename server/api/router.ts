/*
 * Copyright Strimzi authors.
 * License: Apache License 2.0 (see the file LICENSE or http://apache.org/licenses/LICENSE-2.0.html).
 */
import express from 'express';
import { createProxyServer } from 'http-proxy';
import { UIServerModule } from 'types';

import {
  proxyErrorHandler,
  proxyCompleteHandler,
  proxyStartHandler,
} from './controller';

const moduleName = 'api';

export const ApiModule: UIServerModule = {
  moduleName,
  addModule: (logGenerator, authFn, serverConfig) => {
    const { entry } = logGenerator(moduleName);
    const { proxy } = serverConfig;
    const { debug, exit } = entry('addModule', proxy);
    const { hostname, port, contextRoot, transport } = proxy;
    const { cert, minTLS } = transport;

    const proxyConfig = {
      target: `${cert ? 'https' : 'http'}://${hostname}:${port}${contextRoot}`,
      ca: cert,
      minVersion: minTLS,
      changeOrigin: true,
      secure: cert ? true : false,
    };

    debug(`api proxy configuration`, JSON.stringify(proxyConfig));

    const routerForModule = express.Router();
    const backendProxy = createProxyServer(proxyConfig);

    // add proxy event handlers
    backendProxy.on('error', proxyErrorHandler);
    backendProxy.on('proxyReq', proxyStartHandler);
    backendProxy.on('proxyRes', proxyCompleteHandler);
    // proxy all requests post auth check
    routerForModule.all('*', authFn, (req, res) => backendProxy.web(req, res));

    return exit({ mountPoint: '/api', routerForModule });
  },
};
