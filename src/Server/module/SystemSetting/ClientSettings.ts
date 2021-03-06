import { SystemSetting } from "./SystemSetting";

/**
 * 客户端程序会用到的一些设置
 */

//侧边栏功能区按钮的最上面显示程序logo
SystemSetting.addSystemSetting('client.sidebar.showLogo', true, false, 'boolean');

//侧边栏功能区logo添加一些内边距
SystemSetting.addSystemSetting('client.sidebar.logoPadding', true, false, 'boolean');

//在浏览器标题栏，以及邮件中显示的程序名称
SystemSetting.addSystemSetting('client.programName', 'NodeBook', false, 'string');

//代码编辑器 显示行号
SystemSetting.addSystemSetting('client.editor.lineNumbers', true, false, 'boolean');

//代码编辑器 平滑滚动
SystemSetting.addSystemSetting('client.editor.smoothScrolling', true, false, 'boolean');

//代码编辑器 minimap
SystemSetting.addSystemSetting('client.editor.minimap', true, false, 'boolean');

//代码编辑器 字体大小
SystemSetting.addSystemSetting('client.editor.fontSize', 14, false, 'number');

//用户快捷方式数据
SystemSetting.addSystemSetting('client.shortcut', '[]', false, 'string');

//刷新任务列表时间间隔
SystemSetting.addSystemSetting('client.task.listRefreshInterval', 10 * 1000, false, 'number');

//刷新任务日志时间间隔
SystemSetting.addSystemSetting('client.task.logRefreshInterval', 2 * 1000, false, 'number');

//任务日志字体大小
SystemSetting.addSystemSetting('client.taskLog.fontSize', 14, false, 'number');

//显示每条任务日志的时间
SystemSetting.addSystemSetting('client.taskLog.displayTime', true, false, 'boolean');

//终端字体大小
SystemSetting.addSystemSetting('client.terminal.fontSize', 14, false, 'number');

//是否开启终端提示音
SystemSetting.addSystemSetting('client.terminal.bellSound', true, false, 'boolean');
