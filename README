分享一个网站去中心化的探索~

原理：把网站资源上传到各大图床、相册上，前端通过 Service Worker 代理，然后从图片中还原出原始数据。于是自己的网站只需放置一个极小的 HTML 和 JS 文件，即可享受无限带宽。

演示：https://fanhtml5.github.io/

因为 Service Worker 具有持续性，所以只要访问过一次，之后就算网站挂了，用户仍能正常访问 —— 除非所有的备用节点都挂了。（装上 Service Worker 就去中心了）

此外，这个方案还可用于 DDOS 防御 —— 网站即使被打垮了，但之前访问过的用户，仍能访问。

相比传统 DNS 负载均衡至少有好几秒的延时，Service Worker 通过 JS 实现节点切换，延时可以精确到 ms 级别；并且 DNS 协议是公开的，很容易遍历对应的 IP，而 JS 则可加上代码混淆，增加分析的难度。。。

关于前端负载均衡，之前写的一些思路：https://yq.aliyun.com/articles/236582

打开浏览器隐身模式，访问 https://fanhtml5.github.io/big-pic.png 出现的是个图片，但用 curl 访问并不是图片。这就是这个方案有趣的地方~
