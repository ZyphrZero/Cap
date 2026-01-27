import { createSignal, For, Show } from "solid-js";
import wechatQrImg from "../../../assets/wx-CJ7L738a.png";

const FAQ_ITEMS = [
	{
		question: "录制时画面卡顿怎么办？",
		answer:
			"1. 尝试降低录制分辨率或帧率\n2. 关闭不必要的后台程序\n3. 确保显卡驱动是最新版本\n4. 使用工作室模式而非即时模式",
	},
	{
		question: "为什么没有声音？",
		answer:
			"1. 检查麦克风权限是否已授予\n2. 确认系统音频设置正确\n3. 在录制设置中检查音频源选择",
	},
	{
		question: "导出的视频在哪里？",
		answer:
			"默认保存在用户文档目录下的 Cap 文件夹中，您也可以在导出时选择自定义保存位置。",
	},
	{
		question: "如何录制系统声音？",
		answer:
			"在录制设置中开启「录制系统音频」选项。注意：macOS 需要 13.0 或更高版本才支持此功能。",
	},
	{
		question: "摄像头画面是黑的？",
		answer:
			"1. 检查摄像头权限是否已授予\n2. 确认摄像头没有被其他程序占用\n3. 尝试重新插拔摄像头",
	},
	{
		question: "软件打开很慢/白屏？",
		answer:
			"这可能是因为您使用的是调试版本。请使用 Release 版本以获得最佳性能。",
	},
];

export default function FeedbackTab() {
	const [expandedIndex, setExpandedIndex] = createSignal<number | null>(null);

	const toggleFaq = (index: number) => {
		setExpandedIndex(expandedIndex() === index ? null : index);
	};

	return (
		<div class="flex flex-col w-full h-full">
			<div class="flex-1 custom-scroll">
				<div class="p-6 space-y-6">
					{/* 微信联系卡片 */}
					<div class="bg-gradient-to-br from-[#07C160]/5 to-[#07C160]/10 rounded-2xl p-6">
						<div class="flex items-start gap-6">
							{/* 二维码 */}
							<div class="shrink-0">
								<div class="bg-white p-2 rounded-xl shadow-sm">
									<img
										src={wechatQrImg}
										alt="微信二维码"
										class="w-32 h-32 object-contain"
									/>
								</div>
							</div>

							{/* 文字说明 */}
							<div class="flex-1 pt-2">
								<div class="flex items-center gap-2 mb-3">
									<div class="w-6 h-6 bg-[#07C160] rounded-full flex items-center justify-center">
										<svg
											class="w-4 h-4 text-white"
											viewBox="0 0 24 24"
											fill="currentColor"
										>
											<path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18z" />
										</svg>
									</div>
									<h3 class="text-base font-semibold text-gray-12">微信反馈</h3>
								</div>
								<p class="text-sm text-gray-11 leading-relaxed">
									遇到问题或有建议？扫码添加微信，直接联系我！
								</p>
								<p class="text-xs text-gray-9 mt-3">
									Cap 开源项目中文适配版（B站 @跨界胶水 优化）
								</p>
								<p class="text-xs text-gray-9 mt-2">
									基于 AGPLv3 协议开源 |
									<a
										href="https://github.com/CapSoftware/Cap"
										target="_blank"
										class="text-blue-500 hover:underline"
										rel="noopener"
									>
										原项目
									</a>
								</p>
							</div>
						</div>
					</div>

					{/* 常见问题 */}
					<div>
						<h3 class="text-sm font-semibold text-gray-12 mb-4 flex items-center gap-2">
							<svg
								class="w-4 h-4 text-gray-10"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
							>
								<circle cx="12" cy="12" r="10" />
								<path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
								<line x1="12" y1="17" x2="12.01" y2="17" />
							</svg>
							常见问题
						</h3>
						<div class="space-y-2">
							<For each={FAQ_ITEMS}>
								{(item, index) => (
									<div class="border border-gray-3 rounded-xl overflow-hidden bg-gray-1/50">
										<button
											onClick={() => toggleFaq(index())}
											class="w-full px-4 py-3 text-left flex justify-between items-center hover:bg-gray-2/50 transition-colors"
										>
											<span class="text-sm text-gray-12">{item.question}</span>
											<span
												class={`text-gray-10 transition-transform duration-200 ${expandedIndex() === index() ? "rotate-45" : ""}`}
											>
												<svg
													class="w-4 h-4"
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													stroke-width="2"
												>
													<line x1="12" y1="5" x2="12" y2="19" />
													<line x1="5" y1="12" x2="19" y2="12" />
												</svg>
											</span>
										</button>
										<Show when={expandedIndex() === index()}>
											<div class="px-4 pb-4 text-sm text-gray-10 whitespace-pre-line border-t border-gray-3 pt-3 bg-gray-2/30">
												{item.answer}
											</div>
										</Show>
									</div>
								)}
							</For>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
