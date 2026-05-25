package api

import (
	"net/http"
	"strings"
)

func localizedErrorMessage(status int, message string) string {
	trimmed := strings.TrimSpace(message)
	if trimmed == "" {
		return fallbackErrorMessage(status)
	}
	if localized, ok := apiErrorMessages[trimmed]; ok {
		return localized
	}
	if containsChinese(trimmed) {
		return trimmed
	}
	return fallbackErrorMessage(status)
}

func fallbackErrorMessage(status int) string {
	switch {
	case status == http.StatusUnauthorized:
		return "请先登录。"
	case status == http.StatusForbidden:
		return "没有权限执行此操作。"
	case status == http.StatusNotFound:
		return "资源不存在或已失效。"
	case status == http.StatusConflict:
		return "当前状态不允许执行此操作。"
	case status == http.StatusTooManyRequests:
		return "操作过于频繁，请稍后再试。"
	case status >= http.StatusInternalServerError:
		return "服务器暂时无法处理请求，请稍后重试。"
	case status >= http.StatusBadRequest:
		return "请求参数无效，请检查后重试。"
	default:
		return "操作失败，请稍后重试。"
	}
}

func containsChinese(value string) bool {
	for _, r := range value {
		if r >= '\u4e00' && r <= '\u9fff' {
			return true
		}
	}
	return false
}

var apiErrorMessages = map[string]string{
	"admin service is unavailable":                         "管理服务暂不可用，请稍后重试。",
	"cannot delete redeemed card key":                      "已兑换的卡密不能删除。",
	"card key is not redeemable":                           "卡密无效、已过期或已被使用。",
	"card key not found":                                   "卡密不存在。",
	"download file is missing":                             "下载文件缺失，请联系管理员。",
	"download not found":                                   "下载链接不存在或已失效。",
	"failed to create goods":                               "创建货物失败，请稍后重试。",
	"failed to create session":                             "登录失败，请稍后重试。",
	"failed to delete card key":                            "删除卡密失败，请稍后重试。",
	"failed to delete goods":                               "删除货物失败，请稍后重试。",
	"failed to export files":                               "导出文件失败，请稍后重试。",
	"failed to generate card key":                          "生成卡密失败，请稍后重试。",
	"failed to load card keys":                             "加载卡密列表失败，请稍后重试。",
	"failed to load goods":                                 "加载货物列表失败，请稍后重试。",
	"failed to load goods options":                         "加载可选货物失败，请稍后重试。",
	"failed to load logs":                                  "加载日志失败，请稍后重试。",
	"failed to load overview":                              "加载概览数据失败，请稍后重试。",
	"failed to load settings":                              "加载系统设置失败，请稍后重试。",
	"failed to prepare redemption files":                   "准备收货文件失败，请联系管理员。",
	"failed to refresh session":                            "刷新登录状态失败，请重新登录。",
	"failed to register uploaded file":                     "登记上传文件失败，请稍后重试。",
	"failed to update goods":                               "更新货物失败，请稍后重试。",
	"failed to update settings":                            "更新系统设置失败，请稍后重试。",
	"file goods not found":                                 "文件类货物不存在。",
	"file is too large":                                    "单个文件大小过大。",
	"goods has card keys":                                  "该货物已有卡密或兑换记录，不能删除。",
	"goods is disabled":                                    "货物已停用，不能生成卡密。",
	"goods is not file type":                               "该货物不是文件类型。",
	"goods not found":                                      "货物不存在。",
	"invalid card key":                                     "卡密格式无效。",
	"invalid card key request":                             "卡密请求无效，请检查后重试。",
	"invalid csrf token":                                   "登录状态已失效，请刷新页面后重试。",
	"invalid export scope":                                 "导出范围无效。",
	"invalid expiration":                                   "有效期设置无效。",
	"invalid goods request":                                "货物请求无效，请检查后重试。",
	"invalid goods update request":                         "货物更新请求无效，请检查后重试。",
	"invalid login request":                                "请输入用户名和密码。",
	"invalid redeem request":                               "兑换请求无效，请检查卡密后重试。",
	"invalid settings request":                             "设置请求无效，请检查后重试。",
	"invalid upload":                                       "上传请求无效。",
	"invalid username or password":                         "用户名或密码错误。",
	"no files selected":                                    "请选择要上传的文件。",
	"no files to export":                                   "没有可导出的文件。",
	"not enough available file inventory":                  "可用文件库存不足。",
	"not found":                                            "接口不存在。",
	"only JSON files are allowed":                          "仅支持上传 JSON 文件。",
	"receipt not found":                                    "收货凭证不存在或已失效。",
	"selected files are too large":                         "选择的文件总大小过大。",
	"service address must be a valid URL":                  "服务地址必须是有效 URL。",
	"service address must use http or https":               "服务地址必须使用 http 或 https。",
	"status must be ACTIVE or DISABLED":                    "货物状态筛选无效。",
	"status must be ACTIVE, REDEEMED, EXPIRED, or DELETED": "卡密状态筛选无效。",
	"too many download attempts":                           "下载尝试过于频繁，请稍后再试。",
	"too many files selected":                              "一次上传的文件数量过多。",
	"too many login attempts":                              "登录尝试过于频繁，请稍后再试。",
	"too many redemption attempts":                         "兑换尝试过于频繁，请稍后再试。",
	"type must be redemptions, downloads, or admin":        "日志类型无效。",
	"unauthorized":                                         "请先登录。",
}
