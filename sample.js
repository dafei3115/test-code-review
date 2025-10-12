// 测试代码文件
function calculateSum(a, b) {
  var result = a + b; // 使用var而不是const/let
  return result;
}

// 没有文档注释的函数
function processData(data) {
  if (data && data.length > 0) {
    for (let i = 0; i < data.length; i++) {
      // 缺少处理逻辑
    }
  }
  return null;
}

// 使用了eval的不安全代码
eval('console.log("This is unsafe code")');

const obj = { a: 1, b: 2 };
for (var key in obj) {
  console.log(key + ': ' + obj[key]);
}
