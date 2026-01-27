import { t } from "~/components/I18nProvider";
import alipayImg from "../../../assets/alipay.jpg";
import wechatPayImg from "../../../assets/wechat-pay.png";

export default function Page() {
	return (
		<div class="flex flex-col h-full items-center">
			<div class="relative flex-1 custom-scroll w-full">
				<div
					class="flex flex-col p-6 gap-4"
					style={{ "max-width": "600px", margin: "0 auto" }}
				>
					{/* 标题区域 */}
					<div class="text-center pb-4 border-b border-gray-3">
						<h2 class="text-xl font-semibold text-gray-12 mb-2">
							{t("changelogPage.title")}
						</h2>
						<p class="text-sm text-gray-10">{t("changelogPage.description")}</p>
					</div>

					{/* 收款码区域 */}
					<div class="flex flex-row gap-6 justify-center items-start py-6">
						{/* 微信支付 */}
						<div class="flex flex-col items-center">
							<div class="p-3 bg-[#07C160]/10 rounded-2xl mb-3">
								<img
									src={wechatPayImg}
									alt="微信支付"
									class="w-44 h-44 object-contain rounded-lg"
								/>
							</div>
							<div class="flex items-center gap-2">
								<div class="w-5 h-5 bg-[#07C160] rounded-full flex items-center justify-center">
									<svg
										class="w-3 h-3 text-white"
										viewBox="0 0 24 24"
										fill="currentColor"
									>
										<path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89c-.135-.01-.269-.03-.407-.03zm-2.53 3.274c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.969-.982z" />
									</svg>
								</div>
								<span class="text-sm font-medium text-gray-12">微信支付</span>
							</div>
						</div>

						{/* 支付宝 */}
						<div class="flex flex-col items-center">
							<div class="p-3 bg-[#1677FF]/10 rounded-2xl mb-3">
								<img
									src={alipayImg}
									alt="支付宝"
									class="w-44 h-44 object-contain rounded-lg"
								/>
							</div>
							<div class="flex items-center gap-2">
								<div class="w-5 h-5 bg-[#1677FF] rounded-full flex items-center justify-center">
									<svg
										class="w-3 h-3 text-white"
										viewBox="0 0 24 24"
										fill="currentColor"
									>
										<path d="M21.422 15.358c-3.83-1.153-6.055-1.84-7.373-2.18.471-.963.871-2.012 1.17-3.122h-4.26v-1.27h5.14V7.79h-5.14V5.952h-2.16v1.837H3.79v.996h5.01v1.271H4.2v.996h8.33a15.86 15.86 0 0 1-.776 2.09c-1.884-.357-3.853-.436-5.478-.058-2.04.474-3.593 1.818-3.927 3.564-.334 1.746.36 3.393 1.834 4.35 1.473.958 3.39 1.074 5.055.306 1.665-.768 2.882-2.283 3.21-3.998.328-1.715-.24-3.46-1.498-4.604 1.41.37 3.473.95 6.727 1.888.469.135.96.27 1.47.41A9.963 9.963 0 0 1 12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10a9.954 9.954 0 0 1-.578 3.358zM9.076 17.63c-.326.855-.94 1.543-1.717 1.925-.777.382-1.666.382-2.487.0-.82-.382-1.434-1.07-1.717-1.925-.283-.855-.17-1.79.316-2.614.486-.824 1.29-1.39 2.25-1.583.96-.193 1.96.01 2.8.567.84.558 1.41 1.43 1.596 2.44.186 1.01-.04 2.05-.541 2.91-.5.86-1.3 1.5-2.24 1.79z" />
									</svg>
								</div>
								<span class="text-sm font-medium text-gray-12">支付宝</span>
							</div>
						</div>
					</div>

					{/* 感谢文字 */}
					<div class="text-center pt-4 border-t border-gray-3">
						<p class="text-xs text-gray-9">{t("changelogPage.thanks")}</p>
					</div>
				</div>
			</div>
		</div>
	);
}
