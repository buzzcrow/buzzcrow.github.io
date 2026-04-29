# Makefile for Jekyll site
# 用法: make [target]

# 变量定义
JEKYLL := RUBYOPT="-W0" bundle exec jekyll
SITE_DIR := _site
PORT := 4000
HOST := localhost

# 默认目标
.DEFAULT_GOAL := run

.PHONY: help build run serve clean watch install test

# 显示帮助信息
help:
	@echo "可用命令:"
	@echo "  make install    安装 Ruby 依赖 (bundle install)"
	@echo "  make build      构建静态站点到 _site/ 目录"
	@echo "  make run        构建并启动本地服务器 (默认)"
	@echo "  make serve      同 run"
	@echo "  make watch      构建并启动带监视功能的服务器"
	@echo "  make test       运行构建测试"
	@echo "  make clean      清理生成的文件"
	@echo "  make help       显示此帮助信息"

# 安装依赖
install:
	@echo "安装 Ruby 依赖..."
	bundle install

# 构建静态站点
build: install
	@echo "构建 Jekyll 站点..."
	$(JEKYLL) build
	@echo "构建完成！站点生成在 $(SITE_DIR)/ 目录"

# 运行测试构建
test: build
	@echo "构建测试完成，未发现错误。"

# 构建并启动本地服务器
run: build
	@echo "启动本地开发服务器..."
	@echo "访问地址: http://$(HOST):$(PORT)/buzzcrow.github.io/"
	@echo "按 Ctrl+C 停止服务器"
	$(JEKYLL) serve --port $(PORT) --host $(HOST)

# serve 是 run 的别名
serve: run

# 启动带监视功能的服务器
watch: install
	@echo "启动带文件监视功能的服务器..."
	@echo "访问地址: http://$(HOST):$(PORT)/buzzcrow.github.io/"
	@echo "按 Ctrl+C 停止服务器"
	$(JEKYLL) serve --port $(PORT) --host $(HOST) --watch

# 清理生成的文件
clean:
	@echo "清理生成的文件..."
	rm -rf $(SITE_DIR)
	@echo "清理完成！"

# 快速检查环境
check:
	@echo "检查环境..."
	@which bundle >/dev/null 2>&1 || echo "警告: bundle 未安装，请先运行 'make install'"
	@which ruby >/dev/null 2>&1 && ruby --version || echo "错误: Ruby 未安装"
	@echo "环境检查完成"