import { BaseCLI } from '@midwayjs/command-core';
import { execSync } from 'child_process';
import { PluginList } from './plugins';
import { existsSync } from 'fs';
import { resolve } from 'path';
const enquirer = require('enquirer');

export class CLI extends BaseCLI {
  loadDefaultPlugin() {
    const command = this.commands && this.commands[0];
    // // version not load plugin
    if (this.argv.v || this.argv.version) {
      return;
    }
    let needLoad = PluginList;
    if (!this.argv.h && command) {
      needLoad = PluginList.filter(plugin => {
        if (!plugin || !plugin.mod) {
          return false;
        }
        if (plugin.command) {
          if (plugin.command !== command) {
            return false;
          }
          return true;
        }
        try {
          const pluginJson = require(plugin.mod + '/plugin.json');
          if (pluginJson.match) {
            // 匹配命令是否一致
            if (pluginJson.match.command) {
              if (pluginJson.match.command !== command) {
                return false;
              }
            }
            // 匹配文件是否存在
            if (pluginJson.match.file) {
              const filePath = resolve(this.cwd, pluginJson.match.file);
              if (!existsSync(filePath)) {
                return false;
              }
            }
            return true;
          }
        } catch {
          //
        }
      });
    }
    this.debug('Plugin load list', needLoad);
    needLoad.forEach(pluginInfo => {
      try {
        const mod = require(pluginInfo.mod);
        if (pluginInfo.name) {
          if (mod[pluginInfo.name]) {
            this.core.addPlugin(mod[pluginInfo.name]);
          }
        } else if (typeof mod === 'object') {
          Object.keys(mod).forEach(key => {
            this.core.addPlugin(mod[key]);
          });
        }
      } catch {
        //
      }
    });
  }

  // cli 扩展
  loadExtensions() {
    return {
      debug: this.debug.bind(this),
      enquirer,
    };
  }

  error(err) {
    if (err && err.message) {
      console.log(err.message);
      throw err;
    } else {
      console.log(err);
      throw new Error(err);
    }
  }

  async loadPlugins() {
    this.debug('command & options', this.argv);
    await super.loadPlugins();
    await this.loadDefaultOptions();
  }

  async loadDefaultOptions() {
    if (this.commands.length) {
      return;
    }

    if (this.argv.v || this.argv.version) {
      this.displayVersion();
    } else {
      // 默认没有command的时候展示帮助
      this.argv.h = true;
    }
  }

  debug(...args) {
    if (!this.argv.V && !this.argv.verbose && !process.env.FAAS_CLI_VERBOSE) {
      return;
    }
    const log = this.loadLog();
    log.log('[Verbose] ', ...args);
  }

  displayVersion() {
    const log = this.loadLog();
    try {
      const nodeVersion = execSync('node -v').toString().replace('\n', '');
      log.log('Node.js'.padEnd(20) + nodeVersion);
    } catch {
      //
    }

    try {
      // midway-faas version
      const cliVersion = require('../package.json').version;
      log.log('@ali/faas-cli'.padEnd(20) + `v${cliVersion}`);
    } catch {
      //
    }
  }

  displayUsage(commandsArray, usage, coreInstance) {
    this.displayVersion();
    super.displayUsage(commandsArray, usage, coreInstance);
  }
}