import { PassThrough } from "node:stream";
import { createReadableStreamFromReadable } from "@react-router/node";
import { Links, Meta, Scripts, ScrollRestoration, ServerRouter, UNSAFE_withComponentProps } from "react-router";
import { isbot } from "isbot";
import { renderToPipeableStream } from "react-dom/server";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
//#region \0rolldown/runtime.js
var __defProp = Object.defineProperty;
var __exportAll = (all, no_symbols) => {
	let target = {};
	for (var name in all) __defProp(target, name, {
		get: all[name],
		enumerable: true
	});
	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
	return target;
};
//#endregion
//#region app/entry.server.jsx
var entry_server_exports = /* @__PURE__ */ __exportAll({
	default: () => handleRequest,
	streamTimeout: () => streamTimeout
});
var streamTimeout = 5e3;
function handleRequest(request, responseStatusCode, responseHeaders, routerContext, loadContext) {
	return new Promise((resolve, reject) => {
		let shellRendered = false;
		const userAgent = request.headers.get("user-agent");
		const readyOption = userAgent && isbot(userAgent) || routerContext.isSpaMode ? "onAllReady" : "onShellReady";
		const { pipe, abort } = renderToPipeableStream(/* @__PURE__ */ jsx(ServerRouter, {
			context: routerContext,
			url: request.url
		}), {
			[readyOption]() {
				shellRendered = true;
				const body = new PassThrough();
				const stream = createReadableStreamFromReadable(body);
				responseHeaders.set("Content-Type", "text/html");
				resolve(new Response(stream, {
					headers: responseHeaders,
					status: responseStatusCode
				}));
				pipe(body);
			},
			onShellError(error) {
				reject(error);
			},
			onError(error) {
				responseStatusCode = 500;
				if (shellRendered) console.error(error);
			}
		});
		setTimeout(abort, 6e3);
	});
}
//#endregion
//#region app/components/ErrorBoundary.jsx
var ErrorBoundary = class extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			hasError: false,
			error: null
		};
	}
	static getDerivedStateFromError(error) {
		return {
			hasError: true,
			error
		};
	}
	componentDidCatch(error, errorInfo) {
		console.error("ErrorBoundary caught runtime exception:", error, errorInfo);
	}
	render() {
		if (this.state.hasError) return /* @__PURE__ */ jsx("div", {
			className: "min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans",
			children: /* @__PURE__ */ jsxs("div", {
				className: "max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-slate-100 text-center",
				children: [
					/* @__PURE__ */ jsx("div", {
						className: "w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4",
						children: /* @__PURE__ */ jsx("svg", {
							className: "w-8 h-8",
							fill: "none",
							stroke: "currentColor",
							viewBox: "0 0 24 24",
							children: /* @__PURE__ */ jsx("path", {
								strokeLinecap: "round",
								strokeLinejoin: "round",
								strokeWidth: "2",
								d: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
							})
						})
					}),
					/* @__PURE__ */ jsx("h2", {
						className: "text-xl font-bold text-slate-800 mb-2",
						children: "เกิดข้อผิดพลาดในการแสดงผล"
					}),
					/* @__PURE__ */ jsx("p", {
						className: "text-sm text-slate-500 mb-6 leading-relaxed",
						children: "ขออภัยในความไม่สะดวก ระบบพบข้อผิดพลาดที่ไม่คาดคิด กรุณากดปุ่มด้านล่างเพื่อลองใหม่อีกครั้ง"
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "flex gap-3 justify-center",
						children: [/* @__PURE__ */ jsx("button", {
							onClick: () => window.location.reload(),
							className: "bg-blue-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-blue-700 transition-all shadow-sm",
							children: "รีเฟรชหน้าเว็บ"
						}), /* @__PURE__ */ jsx("button", {
							onClick: () => window.location.href = "/",
							className: "bg-slate-100 text-slate-700 px-5 py-2.5 rounded-xl font-medium hover:bg-slate-200 transition-all",
							children: "กลับหน้าหลัก"
						})]
					})
				]
			})
		});
		return this.props.children;
	}
};
//#endregion
//#region app/lib/supabase.js
var supabaseUrl = "https://ieomclhmsmskxblcmxpc.supabase.co".trim();
var supabaseAnonKey = "sb_publishable_JUe3tiuvTPBFtO3ViZIVeQ_I2bihkbC".trim();
var supabase = createClient(supabaseUrl, supabaseAnonKey);
//#endregion
//#region app/context/AuthContext.jsx
var AuthContext = createContext({
	user: null,
	profile: null,
	setProfile: () => {},
	loading: true,
	refreshProfile: async () => {},
	signOut: async () => {}
});
function AuthProvider({ children }) {
	const [user, setUser] = useState(null);
	const [profile, setProfile] = useState(null);
	const [loading, setLoading] = useState(true);
	const fetchProfile = useCallback(async (userId) => {
		try {
			const { data, error } = await supabase.rpc("sync_profile_credits", { p_user_id: userId }).single();
			if (data && !error) setProfile(data);
		} catch (err) {
			console.error("Failed to sync profile:", err);
		}
	}, []);
	const refreshProfile = useCallback(async () => {
		if (user?.id) await fetchProfile(user.id);
	}, [user, fetchProfile]);
	useEffect(() => {
		let isMounted = true;
		supabase.auth.getSession().then(({ data: { session } }) => {
			if (!isMounted) return;
			setUser(session?.user ?? null);
			if (session?.user) fetchProfile(session.user.id);
			setLoading(false);
		});
		const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
			if (!isMounted) return;
			const currentUser = session?.user ?? null;
			setUser(currentUser);
			if (currentUser) fetchProfile(currentUser.id);
			else setProfile(null);
			setLoading(false);
		});
		return () => {
			isMounted = false;
			subscription.unsubscribe();
		};
	}, [fetchProfile]);
	const signOut = async () => {
		await supabase.auth.signOut();
		setUser(null);
		setProfile(null);
	};
	return /* @__PURE__ */ jsx(AuthContext.Provider, {
		value: {
			user,
			profile,
			setProfile,
			loading,
			refreshProfile,
			signOut
		},
		children
	});
}
var useAuth = () => useContext(AuthContext);
//#endregion
//#region app/components/FeedbackModal.jsx
var POSITIVE_KEYWORDS = [
	"ดี",
	"ดีมาก",
	"เยี่ยม",
	"เยี่ยมมาก",
	"ชอบ",
	"ชอบมาก",
	"ประทับใจ",
	"สุดยอด",
	"เพอร์เฟ็ค",
	"เลิศ",
	"โคตรดี",
	"ปัง",
	"ปังมาก",
	"ใช้งานง่าย",
	"สะดวก",
	"คุ้มค่า",
	"คุ้มมาก",
	"แจ่ม",
	"เจ๋ง",
	"น่าใช้",
	"ครบ",
	"ครบมาก",
	"มีประโยชน์",
	"ช่วยได้มาก",
	"พอใจ",
	"พอใจมาก",
	"รัก",
	"รักเลย",
	"ขอบคุณ",
	"ขอบคุณมาก",
	"ขอบใจ",
	"ได้ผล",
	"ใช้ได้ดี",
	"ฉลาด",
	"น่าทึ่ง",
	"ทึ่ง",
	"ประหลาดใจ",
	"เกินคาด",
	"เกินความคาดหมาย",
	"perfect",
	"great",
	"good",
	"love",
	"awesome",
	"excellent",
	"amazing",
	"wow",
	"helpful"
];
var NEGATIVE_KEYWORDS = [
	"แย่",
	"แย่มาก",
	"ห่วย",
	"ห่วยมาก",
	"ไม่ดี",
	"ไม่โอเค",
	"ไม่ชอบ",
	"ผิดหวัง",
	"ผิดหวังมาก",
	"บั๊ก",
	"bug",
	"error",
	"ผิดพลาด",
	"พัง",
	"ใช้ไม่ได้",
	"ใช้ยาก",
	"งง",
	"งงมาก",
	"ช้า",
	"ช้ามาก",
	"แพง",
	"แพงมาก",
	"ไม่คุ้ม",
	"เสียเงิน",
	"เสียดาย",
	"เสียใจ",
	"โกรธ",
	"หัวร้อน",
	"น่าหัวเสีย",
	"น่าหัวร้อน",
	"ฉิบหาย",
	"ห่า",
	"บ้า",
	"ไร้สาระ",
	"ปัญหา",
	"ไม่ work",
	"work ไม่ได้",
	"หน้าขาว",
	"ค้าง",
	"หยุด",
	"ไม่พอใจ",
	"ไม่พอ",
	"อยากให้แก้",
	"ควรปรับ",
	"ควรแก้",
	"ขอให้ปรับ",
	"ต้องแก้",
	"terrible",
	"bad",
	"awful",
	"worst",
	"broken",
	"useless",
	"hate",
	"disappointed",
	"poor",
	"slow",
	"expensive"
];
/**
* วิเคราะห์ sentiment ของ comment โดยนับ keyword เชิงบวก/ลบ
* @returns 'positive' | 'negative' | 'neutral'
*/
function detectSentiment(text) {
	if (!text || text.trim().length === 0) return "neutral";
	const lower = text.toLowerCase();
	let posScore = 0;
	let negScore = 0;
	POSITIVE_KEYWORDS.forEach((kw) => {
		if (lower.includes(kw.toLowerCase())) posScore++;
	});
	NEGATIVE_KEYWORDS.forEach((kw) => {
		if (lower.includes(kw.toLowerCase())) negScore++;
	});
	if (posScore === 0 && negScore === 0) return "neutral";
	return posScore >= negScore ? "positive" : "negative";
}
function FeedbackModal({ isOpen, onClose }) {
	const [rating, setRating] = useState(0);
	const [hoverRating, setHoverRating] = useState(0);
	const [comment, setComment] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isSuccess, setIsSuccess] = useState(false);
	const [error, setError] = useState(null);
	const [ratingWarning, setRatingWarning] = useState(null);
	const checkConsistency = (currentRating, currentComment) => {
		const sentiment = detectSentiment(currentComment);
		if (sentiment === "neutral") {
			setRatingWarning(null);
			return;
		}
		if (currentRating >= 4 && sentiment === "negative") {
			setRatingWarning({
				type: "lower",
				title: "ดูเหมือนว่าคุณมีข้อติชมหรือพบปัญหาอยู่",
				message: "ลองปรับเป็น 1-2 ดาวได้เลยครับ เพื่อให้ทีมพัฒนาเห็นว่ามีปัญหาจริง และจัดลำดับความสำคัญในการแก้ไขให้เร็วขึ้น"
			});
			return;
		}
		if (currentRating <= 2 && sentiment === "positive") {
			setRatingWarning({
				type: "higher",
				title: "ดูเหมือนคุณจะประทับใจในตัวแอป",
				message: "ลองปรับเป็น 4-5 ดาวได้เลยครับ คะแนนที่สูงขึ้นช่วยให้ทีมรู้ว่าฟีเจอร์ไหนทำได้ดี และเป็นกำลังใจในการพัฒนาต่อยอด"
			});
			return;
		}
		setRatingWarning(null);
	};
	if (!isOpen) return null;
	const handleRatingChange = (star) => {
		setRating(star);
		checkConsistency(star, comment);
	};
	const handleCommentBlur = () => {
		if (rating > 0) checkConsistency(rating, comment);
	};
	const handleSubmit = async (e) => {
		e.preventDefault();
		if (rating === 0) {
			setError("กรุณาให้คะแนนอย่างน้อย 1 ดาวครับ");
			return;
		}
		setIsSubmitting(true);
		setError(null);
		try {
			const { data: { session } } = await supabase.auth.getSession();
			if (!(await fetch("/api/feedback", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Authorization": `Bearer ${session?.access_token}`
				},
				body: JSON.stringify({
					rating,
					comment
				})
			})).ok) throw new Error("เกิดข้อผิดพลาดในการส่งข้อมูล");
			setIsSuccess(true);
			setTimeout(() => {
				onClose();
				setIsSuccess(false);
				setRating(0);
				setComment("");
				setRatingWarning(null);
			}, 2500);
		} catch (err) {
			setError(err.message || "ระบบขัดข้อง กรุณาลองใหม่ครับ");
		} finally {
			setIsSubmitting(false);
		}
	};
	const modalContent = /* @__PURE__ */ jsx("div", {
		className: "fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm",
		children: /* @__PURE__ */ jsxs("div", {
			className: "bg-white rounded-2xl p-6 w-full max-w-md shadow-xl transition-all",
			children: [/* @__PURE__ */ jsxs("div", {
				className: "flex justify-between items-center mb-4",
				children: [/* @__PURE__ */ jsx("h2", {
					className: "text-xl font-bold text-gray-900",
					children: "💬 ให้คำติชม / เสนอแนะ"
				}), /* @__PURE__ */ jsx("button", {
					onClick: onClose,
					className: "text-gray-400 hover:text-gray-600 transition-colors",
					children: /* @__PURE__ */ jsx("svg", {
						className: "w-6 h-6",
						fill: "none",
						viewBox: "0 0 24 24",
						stroke: "currentColor",
						children: /* @__PURE__ */ jsx("path", {
							strokeLinecap: "round",
							strokeLinejoin: "round",
							strokeWidth: 2,
							d: "M6 18L18 6M6 6l12 12"
						})
					})
				})]
			}), isSuccess ? /* @__PURE__ */ jsxs("div", {
				className: "text-center py-8",
				children: [
					/* @__PURE__ */ jsx("div", {
						className: "mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4",
						children: /* @__PURE__ */ jsx("svg", {
							className: "h-8 w-8 text-green-600",
							fill: "none",
							viewBox: "0 0 24 24",
							stroke: "currentColor",
							children: /* @__PURE__ */ jsx("path", {
								strokeLinecap: "round",
								strokeLinejoin: "round",
								strokeWidth: "2",
								d: "M5 13l4 4L19 7"
							})
						})
					}),
					/* @__PURE__ */ jsx("h3", {
						className: "text-lg font-bold text-gray-900 mb-2",
						children: "ขอบคุณสำหรับ Feedback ครับ!"
					}),
					/* @__PURE__ */ jsx("p", {
						className: "text-gray-600",
						children: "ข้อความของคุณส่งตรงถึงทีมผู้พัฒนาเรียบร้อยแล้ว"
					})
				]
			}) : /* @__PURE__ */ jsxs("form", {
				onSubmit: handleSubmit,
				children: [
					/* @__PURE__ */ jsx("div", {
						className: "mb-2 flex justify-center space-x-2",
						children: [
							1,
							2,
							3,
							4,
							5
						].map((star) => /* @__PURE__ */ jsx("button", {
							type: "button",
							onClick: () => handleRatingChange(star),
							onMouseEnter: () => setHoverRating(star),
							onMouseLeave: () => setHoverRating(0),
							className: "focus:outline-none transition-transform hover:scale-110",
							children: /* @__PURE__ */ jsx("svg", {
								className: `w-10 h-10 ${(hoverRating || rating) >= star ? "text-yellow-400" : "text-gray-300"}`,
								fill: "currentColor",
								viewBox: "0 0 20 20",
								children: /* @__PURE__ */ jsx("path", { d: "M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" })
							})
						}, star))
					}),
					ratingWarning && /* @__PURE__ */ jsxs("div", {
						className: `mb-4 rounded-xl border px-4 py-3 text-sm flex items-start gap-3 transition-all ${ratingWarning.type === "lower" ? "border-amber-300 bg-amber-50 text-amber-800" : "border-blue-300 bg-blue-50 text-blue-800"}`,
						children: [ratingWarning.type === "lower" ? /* @__PURE__ */ jsx("svg", {
							className: "w-5 h-5 shrink-0 text-amber-500 mt-0.5",
							fill: "none",
							viewBox: "0 0 24 24",
							stroke: "currentColor",
							children: /* @__PURE__ */ jsx("path", {
								strokeLinecap: "round",
								strokeLinejoin: "round",
								strokeWidth: "2",
								d: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
							})
						}) : /* @__PURE__ */ jsx("svg", {
							className: "w-5 h-5 shrink-0 text-blue-500 mt-0.5",
							fill: "none",
							viewBox: "0 0 24 24",
							stroke: "currentColor",
							children: /* @__PURE__ */ jsx("path", {
								strokeLinecap: "round",
								strokeLinejoin: "round",
								strokeWidth: "2",
								d: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
							})
						}), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("p", {
							className: "font-bold",
							children: ratingWarning.title
						}), /* @__PURE__ */ jsx("p", {
							className: "mt-1 opacity-90 leading-relaxed",
							children: ratingWarning.message
						})] })]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "mb-4 mt-4",
						children: [/* @__PURE__ */ jsx("label", {
							htmlFor: "comment",
							className: "block text-sm font-medium text-gray-700 mb-1",
							children: "มีอะไรให้เราปรับปรุง หรือประทับใจส่วนไหน พิมพ์บอกเราได้เลยครับ"
						}), /* @__PURE__ */ jsx("textarea", {
							id: "comment",
							rows: "4",
							className: "w-full rounded-xl border border-gray-300 p-3 focus:border-blue-500 focus:ring-blue-500 text-sm resize-none",
							placeholder: "เช่น ใช้งานง่ายมากเลยครับ, อยากให้มีฟีเจอร์นี้เพิ่มหน่อย...",
							value: comment,
							onChange: (e) => setComment(e.target.value),
							onBlur: handleCommentBlur,
							maxLength: 1e3
						})]
					}),
					error && /* @__PURE__ */ jsx("p", {
						className: "text-red-500 text-sm mb-4 text-center bg-red-50 py-2 rounded-lg",
						children: error
					}),
					/* @__PURE__ */ jsx("button", {
						type: "submit",
						disabled: isSubmitting,
						className: `w-full py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors ${isSubmitting ? "opacity-70 cursor-not-allowed" : ""}`,
						children: isSubmitting ? "กำลังส่งข้อมูล..." : "ส่งคำติชม"
					})
				]
			})]
		})
	});
	return createPortal(modalContent, document.body);
}
//#endregion
//#region app/components/Navbar.jsx
function Navbar() {
	const { user, profile, refreshProfile, signOut } = useAuth();
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
	const navigate = useNavigate();
	const location = useLocation();
	const menuRef = useRef(null);
	useEffect(() => {
		setIsMenuOpen(false);
	}, [location]);
	useEffect(() => {
		function handleClickOutside(event) {
			if (menuRef.current && !menuRef.current.contains(event.target)) setIsMenuOpen(false);
		}
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);
	useEffect(() => {
		const handleProfileUpdate = () => {
			refreshProfile();
		};
		window.addEventListener("profileUpdated", handleProfileUpdate);
		return () => {
			window.removeEventListener("profileUpdated", handleProfileUpdate);
		};
	}, [refreshProfile]);
	const handleLogout = async () => {
		await signOut();
		navigate("/");
	};
	return /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("nav", {
		className: "sticky top-0 z-50 bg-white/80 backdrop-blur-md shadow-sm border-b border-slate-200 transition-all",
		children: /* @__PURE__ */ jsx("div", {
			className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8",
			children: /* @__PURE__ */ jsxs("div", {
				className: "flex justify-between h-16",
				children: [/* @__PURE__ */ jsx("div", {
					className: "flex items-center",
					children: /* @__PURE__ */ jsx(Link, {
						to: "/",
						className: "flex-shrink-0 flex items-center",
						children: /* @__PURE__ */ jsx("span", {
							className: "text-2xl font-bold text-blue-600",
							children: "Auto Script"
						})
					})
				}), /* @__PURE__ */ jsx("div", {
					className: "flex items-center space-x-4",
					children: user ? /* @__PURE__ */ jsxs(Fragment, { children: [
						/* @__PURE__ */ jsxs(Link, {
							to: "/pricing",
							className: "group flex items-center bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 text-amber-700 hover:border-amber-300 hover:shadow-md px-4 py-1.5 rounded-full font-bold text-sm transition-all cursor-pointer shadow-sm",
							children: [/* @__PURE__ */ jsx("svg", {
								xmlns: "http://www.w3.org/2000/svg",
								viewBox: "0 0 24 24",
								fill: "currentColor",
								className: "w-4 h-4 mr-1.5 text-amber-500 group-hover:scale-110 transition-transform",
								children: /* @__PURE__ */ jsx("path", {
									fillRule: "evenodd",
									d: "M9 4.5a.75.75 0 0 1 .721.544l.813 2.846a3.75 3.75 0 0 0 2.576 2.576l2.846.813a.75.75 0 0 1 0 1.442l-2.846.813a3.75 3.75 0 0 0-2.576 2.576l-.813 2.846a.75.75 0 0 1-1.442 0l-.813-2.846a3.75 3.75 0 0 0-2.576-2.576l-2.846-.813a.75.75 0 0 1 0-1.442l2.846-.813A3.75 3.75 0 0 0 7.466 7.89l.813-2.846A.75.75 0 0 1 9 4.5ZM18 1.5a.75.75 0 0 1 .728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 0 1 0 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 0 1-1.456 0l-.258-1.036a2.625 2.625 0 0 0-1.91-1.91l-1.036-.258a.75.75 0 0 1 0-1.456l1.036-.258a2.625 2.625 0 0 0 1.91-1.91l.258-1.036A.75.75 0 0 1 18 1.5ZM16.5 15a.75.75 0 0 1 .712.513l.394 1.183c.15.447.5.799.948.948l1.183.395a.75.75 0 0 1 0 1.422l-1.183.395c-.447.15-.799.5-.948.948l-.395 1.183a.75.75 0 0 1-1.422 0l-.395-1.183a1.5 1.5 0 0 0-.948-.948l-1.183-.395a.75.75 0 0 1 0-1.422l1.183-.395c.447-.15.799-.5.948-.948l.395-1.183A.75.75 0 0 1 16.5 15Z",
									clipRule: "evenodd"
								})
							}), /* @__PURE__ */ jsxs("span", { children: [profile ? profile.credits : "...", " เครดิต"] })]
						}),
						/* @__PURE__ */ jsx(Link, {
							to: "/history",
							className: "text-slate-600 hover:text-blue-600 px-3 py-2 font-medium hidden sm:block",
							children: "ประวัติ"
						}),
						/* @__PURE__ */ jsx(Link, {
							to: "/create",
							className: "text-slate-600 hover:text-blue-600 px-3 py-2 font-medium hidden sm:block",
							children: "สร้างสคริปต์"
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "relative",
							ref: menuRef,
							children: [/* @__PURE__ */ jsx("button", {
								onClick: () => setIsMenuOpen(!isMenuOpen),
								"aria-label": "เมนูหลัก",
								"aria-expanded": isMenuOpen,
								"aria-controls": "main-nav-dropdown",
								className: "flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 p-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500",
								children: /* @__PURE__ */ jsx("svg", {
									className: "w-5 h-5 text-slate-600",
									fill: "none",
									stroke: "currentColor",
									viewBox: "0 0 24 24",
									"aria-hidden": "true",
									children: /* @__PURE__ */ jsx("path", {
										strokeLinecap: "round",
										strokeLinejoin: "round",
										strokeWidth: 2,
										d: "M4 6h16M4 12h16M4 18h16"
									})
								})
							}), isMenuOpen && /* @__PURE__ */ jsxs("div", {
								className: "absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-50",
								children: [
									/* @__PURE__ */ jsxs(Link, {
										to: "/create",
										className: "flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-600 sm:hidden",
										children: [/* @__PURE__ */ jsx("svg", {
											className: "w-4 h-4 mr-2",
											fill: "none",
											stroke: "currentColor",
											viewBox: "0 0 24 24",
											children: /* @__PURE__ */ jsx("path", {
												strokeLinecap: "round",
												strokeLinejoin: "round",
												strokeWidth: "2",
												d: "M12 4v16m8-8H4"
											})
										}), " สร้างสคริปต์"]
									}),
									/* @__PURE__ */ jsxs(Link, {
										to: "/history",
										className: "flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-600 sm:hidden",
										children: [/* @__PURE__ */ jsx("svg", {
											className: "w-4 h-4 mr-2",
											fill: "none",
											stroke: "currentColor",
											viewBox: "0 0 24 24",
											children: /* @__PURE__ */ jsx("path", {
												strokeLinecap: "round",
												strokeLinejoin: "round",
												strokeWidth: "2",
												d: "M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"
											})
										}), " ประวัติสคริปต์"]
									}),
									/* @__PURE__ */ jsxs(Link, {
										to: "/pricing",
										className: "flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-amber-600 sm:hidden",
										children: [/* @__PURE__ */ jsx("svg", {
											className: "w-4 h-4 mr-2 text-amber-500",
											fill: "none",
											stroke: "currentColor",
											viewBox: "0 0 24 24",
											children: /* @__PURE__ */ jsx("path", {
												strokeLinecap: "round",
												strokeLinejoin: "round",
												strokeWidth: "2",
												d: "M13 10V3L4 14h7v7l9-11h-7z"
											})
										}), " เติมเครดิต"]
									}),
									/* @__PURE__ */ jsxs("button", {
										onClick: () => {
											setIsMenuOpen(false);
											setIsFeedbackOpen(true);
										},
										className: "flex items-center w-full text-left px-4 py-2 text-sm text-green-600 hover:bg-green-50 font-medium",
										children: [/* @__PURE__ */ jsx("svg", {
											className: "w-4 h-4 mr-2",
											fill: "none",
											stroke: "currentColor",
											viewBox: "0 0 24 24",
											children: /* @__PURE__ */ jsx("path", {
												strokeLinecap: "round",
												strokeLinejoin: "round",
												strokeWidth: "2",
												d: "M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
											})
										}), " ส่งคำติชม"]
									}),
									/* @__PURE__ */ jsxs(Link, {
										to: "/settings",
										className: "flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-600",
										children: [/* @__PURE__ */ jsxs("svg", {
											className: "w-4 h-4 mr-2",
											fill: "none",
											stroke: "currentColor",
											viewBox: "0 0 24 24",
											children: [/* @__PURE__ */ jsx("path", {
												strokeLinecap: "round",
												strokeLinejoin: "round",
												strokeWidth: "2",
												d: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
											}), /* @__PURE__ */ jsx("path", {
												strokeLinecap: "round",
												strokeLinejoin: "round",
												strokeWidth: "2",
												d: "M15 12a3 3 0 11-6 0 3 3 0 016 0z"
											})]
										}), " ตั้งค่าบัญชี"]
									}),
									/* @__PURE__ */ jsxs("button", {
										onClick: () => {
											handleLogout();
										},
										className: "flex items-center w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50",
										children: [/* @__PURE__ */ jsx("svg", {
											className: "w-4 h-4 mr-2",
											fill: "none",
											stroke: "currentColor",
											viewBox: "0 0 24 24",
											children: /* @__PURE__ */ jsx("path", {
												strokeLinecap: "round",
												strokeLinejoin: "round",
												strokeWidth: "2",
												d: "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
											})
										}), " ออกจากระบบ"]
									})
								]
							})]
						})
					] }) : /* @__PURE__ */ jsxs("div", {
						className: "flex items-center gap-1 sm:gap-4",
						children: [
							/* @__PURE__ */ jsx(Link, {
								to: "/pricing",
								className: "hidden sm:block text-slate-600 hover:text-blue-600 px-3 py-2 font-medium",
								children: "แพ็กเกจ"
							}),
							/* @__PURE__ */ jsx(Link, {
								to: "/login",
								className: "text-slate-600 hover:text-blue-600 px-2 py-2 text-sm sm:text-base font-medium whitespace-nowrap",
								children: "เข้าสู่ระบบ"
							}),
							/* @__PURE__ */ jsx(Link, {
								to: "/register",
								className: "bg-blue-600 text-white hover:bg-blue-700 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-sm sm:text-base font-medium transition-colors whitespace-nowrap",
								children: "เริ่มใช้ฟรี"
							})
						]
					})
				})]
			})
		})
	}), /* @__PURE__ */ jsx(FeedbackModal, {
		isOpen: isFeedbackOpen,
		onClose: () => setIsFeedbackOpen(false)
	})] });
}
//#endregion
//#region app/layouts/MainLayout.jsx
function MainLayout() {
	const navigate = useNavigate();
	const location = useLocation();
	useEffect(() => {
		const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
			if (event === "PASSWORD_RECOVERY") navigate("/reset-password");
		});
		if (location.hash && location.hash.includes("type=recovery")) navigate("/reset-password");
		return () => {
			subscription.unsubscribe();
		};
	}, [location, navigate]);
	return /* @__PURE__ */ jsxs("div", {
		className: "min-h-screen bg-slate-50 flex flex-col",
		children: [
			/* @__PURE__ */ jsx(Navbar, {}),
			/* @__PURE__ */ jsx("main", {
				className: "flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8",
				children: /* @__PURE__ */ jsx(Outlet, {})
			}),
			/* @__PURE__ */ jsxs("footer", {
				className: "w-full text-center py-6 text-slate-400 text-sm border-t border-slate-200 mt-auto bg-white flex flex-col gap-2",
				children: [/* @__PURE__ */ jsx("p", { children: "© 2026 Auto Script. All rights reserved." }), /* @__PURE__ */ jsxs("div", {
					className: "flex justify-center flex-wrap gap-x-4 gap-y-2",
					children: [
						/* @__PURE__ */ jsx(Link, {
							to: "/legal",
							className: "hover:text-blue-500 transition-colors",
							children: "เงื่อนไขการให้บริการ (Terms)"
						}),
						/* @__PURE__ */ jsx(Link, {
							to: "/legal",
							className: "hover:text-blue-500 transition-colors",
							children: "นโยบายความเป็นส่วนตัว (PDPA)"
						}),
						/* @__PURE__ */ jsx("a", {
							href: "https://lin.ee/x0yVB1kk",
							target: "_blank",
							rel: "noopener noreferrer",
							className: "hover:text-[#00B900] transition-colors font-medium",
							children: "ติดต่อฝ่ายสนับสนุน (LINE)"
						})
					]
				})]
			})
		]
	});
}
//#endregion
//#region app/root.jsx
var root_exports = /* @__PURE__ */ __exportAll({
	Layout: () => Layout,
	default: () => root_default,
	links: () => links,
	meta: () => meta
});
var links = () => [
	{
		rel: "icon",
		type: "image/svg+xml",
		href: "/favicon.svg"
	},
	{
		rel: "preconnect",
		href: "https://fonts.googleapis.com"
	},
	{
		rel: "preconnect",
		href: "https://fonts.gstatic.com",
		crossOrigin: "anonymous"
	},
	{
		href: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Prompt:wght@300;400;500;600;700&display=swap",
		rel: "stylesheet"
	}
];
var meta = () => [
	{ title: "Auto Script — AI เขียนสคริปต์ขายของ TikTok, Reels, ปักตะกร้า Shopee" },
	{
		name: "description",
		content: "Auto Script ใช้ AI สร้างสคริปต์วิดีโอขายของแบบมืออาชีพ ทั้ง TikTok, Reels และปักตะกร้า Shopee ด้วยสูตรจิตวิทยาการขาย PAS, HSO, FOMO และ Belief-Shifting ไม่ต้องคิดเอง พร้อมถ่ายทำทันที!"
	},
	{
		name: "keywords",
		content: "เขียนสคริปต์, AI เขียนสคริปต์, สคริปต์ขายของ, ปักตะกร้า Shopee, สคริปต์ TikTok, สคริปต์ Reels, คิดคอนเทนต์, Auto Script, สคริปต์รีวิวสินค้า, AI คิดคอนเทนต์"
	},
	{
		name: "robots",
		content: "index, follow"
	},
	{
		name: "author",
		content: "Auto Script"
	},
	{
		tagName: "link",
		rel: "canonical",
		href: "https://autoscript-ai.com/"
	},
	{
		property: "og:type",
		content: "website"
	},
	{
		property: "og:url",
		content: "https://autoscript-ai.com/"
	},
	{
		property: "og:site_name",
		content: "Auto Script"
	},
	{
		property: "og:title",
		content: "Auto Script — AI เขียนสคริปต์ขายของ TikTok, Reels, ปักตะกร้า Shopee"
	},
	{
		property: "og:description",
		content: "ไม่ต้องคิดสคริปต์เอง! ใส่จุดเด่นสินค้า AI จัดโครงสร้างสคริปต์พร้อมถ่ายทำให้ทันที ด้วยสูตรจิตวิทยาการขายระดับโลก PAS, HSO, FOMO และ Belief-Shifting"
	},
	{
		property: "og:image",
		content: "https://autoscript-ai.com/og-image.png"
	},
	{
		property: "og:image:width",
		content: "1200"
	},
	{
		property: "og:image:height",
		content: "630"
	},
	{
		property: "og:locale",
		content: "th_TH"
	},
	{
		name: "twitter:card",
		content: "summary_large_image"
	},
	{
		name: "twitter:title",
		content: "Auto Script — AI เขียนสคริปต์ขายของ TikTok, Reels, ปักตะกร้า"
	},
	{
		name: "twitter:description",
		content: "ไม่ต้องคิดสคริปต์เอง! AI จัดโครงสร้างสคริปต์พร้อมถ่ายทำด้วยสูตรจิตวิทยาการขายระดับโลก"
	},
	{
		name: "twitter:image",
		content: "https://autoscript-ai.com/og-image.png"
	}
];
function Layout({ children }) {
	return /* @__PURE__ */ jsxs("html", {
		lang: "th",
		children: [/* @__PURE__ */ jsxs("head", { children: [
			/* @__PURE__ */ jsx("meta", { charSet: "UTF-8" }),
			/* @__PURE__ */ jsx("meta", {
				name: "viewport",
				content: "width=device-width, initial-scale=1.0"
			}),
			/* @__PURE__ */ jsx(Meta, {}),
			/* @__PURE__ */ jsx(Links, {})
		] }), /* @__PURE__ */ jsxs("body", {
			className: "bg-slate-50 antialiased font-prompt text-slate-800",
			children: [
				children,
				/* @__PURE__ */ jsx(ScrollRestoration, {}),
				/* @__PURE__ */ jsx(Scripts, {})
			]
		})]
	});
}
var root_default = UNSAFE_withComponentProps(function App() {
	return /* @__PURE__ */ jsx(ErrorBoundary, { children: /* @__PURE__ */ jsx(AuthProvider, { children: /* @__PURE__ */ jsx(MainLayout, {}) }) });
});
//#endregion
//#region app/utils/translateError.js
function translateError(errorMsg) {
	if (!errorMsg || typeof errorMsg !== "string") return "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ";
	const msg = errorMsg.toLowerCase();
	if (msg.includes("invalid login credentials")) return "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
	if (msg.includes("email not confirmed")) return "กรุณายืนยันอีเมลในกล่องจดหมายของคุณก่อนเข้าสู่ระบบ";
	if (msg.includes("user already registered")) return "อีเมลนี้ถูกใช้งานแล้ว กรุณาเข้าสู่ระบบ";
	if (msg.includes("password should be at least 6 characters")) return "รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร";
	if (msg.includes("new password should be different from the old password")) return "รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านเดิม";
	if (msg.includes("token has expired") || msg.includes("invalid token")) return "ลิงก์ไม่ถูกต้องหรือหมดอายุแล้ว กรุณาขอลิงก์ใหม่อีกครั้ง";
	if (msg.includes("rate limit exceeded") || msg.includes("too many requests")) return "คุณทำรายการบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่";
	if (msg.includes("once every 60 seconds")) return "เพื่อความปลอดภัย กรุณารอ 60 วินาทีก่อนทำรายการอีกครั้ง";
	if (msg.includes("unable to validate email address")) return "รูปแบบอีเมลไม่ถูกต้อง";
	if (msg.includes("missing email")) return "กรุณาระบุอีเมล";
	if (msg.includes("missing password")) return "กรุณาระบุรหัสผ่าน";
	if (msg.includes("weak_password")) return "รหัสผ่านคาดเดาง่ายเกินไป";
	if (msg.includes("database error")) return "เกิดข้อผิดพลาดที่ระบบฐานข้อมูล กรุณาลองใหม่ในภายหลัง";
	return `เกิดข้อผิดพลาด: ${errorMsg}`;
}
//#endregion
//#region app/routes/forgot-password.jsx
var forgot_password_exports = /* @__PURE__ */ __exportAll({ default: () => forgot_password_default });
function ForgotPassword() {
	const [email, setEmail] = useState("");
	const [loading, setLoading] = useState(false);
	const [message, setMessage] = useState(null);
	const [error, setError] = useState(null);
	const errorRef = useRef(null);
	useEffect(() => {
		if (error && errorRef.current) {
			const y = errorRef.current.getBoundingClientRect().top + window.scrollY - 100;
			window.scrollTo({
				top: y,
				behavior: "smooth"
			});
		}
	}, [error]);
	const handleResetPassword = async (e) => {
		e.preventDefault();
		setLoading(true);
		setError(null);
		setMessage(null);
		const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
		if (error) setError(translateError(error.message));
		else {
			setMessage("หากอีเมลนี้อยู่ในระบบ เราได้ส่งลิงก์รีเซ็ตรหัสผ่านไปให้คุณแล้ว กรุณาตรวจสอบกล่องข้อความ (หรือจดหมายขยะ)");
			setEmail("");
		}
		setLoading(false);
	};
	return /* @__PURE__ */ jsxs("div", {
		className: "max-w-md mx-auto mt-12 bg-white p-8 rounded-xl shadow-sm border border-slate-200",
		children: [
			/* @__PURE__ */ jsx("h2", {
				className: "text-2xl font-bold text-center text-slate-900 mb-6",
				children: "ลืมรหัสผ่าน"
			}),
			error && /* @__PURE__ */ jsx("div", {
				ref: errorRef,
				className: "bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4",
				children: error
			}),
			message && /* @__PURE__ */ jsx("div", {
				className: "bg-green-50 text-green-600 p-3 rounded-lg text-sm mb-4",
				children: message
			}),
			/* @__PURE__ */ jsx("p", {
				className: "text-sm text-slate-600 mb-6 text-center",
				children: "กรุณากรอกอีเมลที่ใช้สมัครบัญชี เราจะส่งลิงก์สำหรับรีเซ็ตรหัสผ่านไปให้คุณทางอีเมล"
			}),
			/* @__PURE__ */ jsxs("form", {
				onSubmit: handleResetPassword,
				className: "space-y-4",
				children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
					className: "block text-sm font-medium text-slate-700 mb-1",
					children: "อีเมล"
				}), /* @__PURE__ */ jsx("input", {
					type: "email",
					required: true,
					value: email,
					onChange: (e) => setEmail(e.target.value),
					className: "w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none",
					placeholder: "your@email.com"
				})] }), /* @__PURE__ */ jsx("button", {
					type: "submit",
					disabled: loading || !email,
					className: `w-full py-2 rounded-lg text-white font-medium transition-colors ${loading || !email ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`,
					children: loading ? "กำลังส่งลิงก์..." : "ส่งลิงก์รีเซ็ตรหัสผ่าน"
				})]
			}),
			/* @__PURE__ */ jsx("div", {
				className: "mt-6 text-center",
				children: /* @__PURE__ */ jsx(Link, {
					to: "/login",
					className: "text-sm text-blue-600 hover:underline font-medium",
					children: "กลับไปหน้าเข้าสู่ระบบ"
				})
			})
		]
	});
}
var forgot_password_default = UNSAFE_withComponentProps(ForgotPassword);
//#endregion
//#region app/routes/reset-password.jsx
var reset_password_exports = /* @__PURE__ */ __exportAll({ default: () => reset_password_default });
function ResetPassword() {
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const errorRef = useRef(null);
	const navigate = useNavigate();
	useEffect(() => {
		if (error && errorRef.current) {
			const y = errorRef.current.getBoundingClientRect().top + window.scrollY - 100;
			window.scrollTo({
				top: y,
				behavior: "smooth"
			});
		}
	}, [error]);
	useEffect(() => {
		const hash = window.location.hash;
		if (hash && hash.includes("error_description=")) {
			const errorMsg = new URLSearchParams(hash.substring(1)).get("error_description");
			setError(translateError(decodeURIComponent(errorMsg).replace(/\+/g, " ")));
		}
	}, []);
	const handleUpdatePassword = async (e) => {
		e.preventDefault();
		setLoading(true);
		setError(null);
		if (password !== confirmPassword) {
			setError("รหัสผ่านไม่ตรงกัน");
			setLoading(false);
			return;
		}
		if (password.length < 8) {
			setError("รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร");
			setLoading(false);
			return;
		}
		if (/[\u0E00-\u0E7F]/.test(password)) {
			setError("รหัสผ่านต้องเป็นภาษาอังกฤษ ห้ามมีภาษาไทย");
			setLoading(false);
			return;
		}
		const { error } = await supabase.auth.updateUser({ password });
		if (error) {
			setError(translateError(error.message));
			setLoading(false);
		} else {
			alert("เปลี่ยนรหัสผ่านสำเร็จ กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่");
			await supabase.auth.signOut();
			navigate("/login");
		}
	};
	return /* @__PURE__ */ jsxs("div", {
		className: "max-w-md mx-auto mt-12 bg-white p-8 rounded-xl shadow-sm border border-slate-200",
		children: [
			/* @__PURE__ */ jsx("h2", {
				className: "text-2xl font-bold text-center text-slate-900 mb-6",
				children: "ตั้งรหัสผ่านใหม่"
			}),
			!error && /* @__PURE__ */ jsxs("div", {
				className: "bg-blue-50 border border-blue-200 text-blue-700 p-4 rounded-lg text-sm mb-6 shadow-sm",
				children: [/* @__PURE__ */ jsx("p", {
					className: "font-semibold mb-1",
					children: "✅ ยืนยันตัวตนสำเร็จ!"
				}), /* @__PURE__ */ jsxs("p", { children: [
					"ระบบได้เข้าสู่ระบบให้คุณชั่วคราวแล้ว ",
					/* @__PURE__ */ jsx("br", {}),
					" ",
					/* @__PURE__ */ jsx("strong", { children: "กรุณาตั้งรหัสผ่านใหม่ด้านล่างทันที" }),
					" เพื่อใช้ในการเข้าสู่ระบบครั้งต่อไปครับ"
				] })]
			}),
			error && /* @__PURE__ */ jsx("div", {
				ref: errorRef,
				className: "bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4",
				children: error
			}),
			/* @__PURE__ */ jsxs("form", {
				onSubmit: handleUpdatePassword,
				className: "space-y-4",
				children: [
					/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
						className: "block text-sm font-medium text-slate-700 mb-1",
						children: "รหัสผ่านใหม่"
					}), /* @__PURE__ */ jsxs("div", {
						className: "relative",
						children: [/* @__PURE__ */ jsx("input", {
							type: showPassword ? "text" : "password",
							required: true,
							value: password,
							onChange: (e) => {
								const val = e.target.value;
								if (!/[\u0E00-\u0E7F]/.test(val)) setPassword(val);
							},
							className: "w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none pr-12",
							placeholder: "ตั้งรหัสผ่านใหม่อย่างน้อย 8 ตัวอักษร",
							minLength: 8
						}), /* @__PURE__ */ jsx("button", {
							type: "button",
							onClick: () => setShowPassword(!showPassword),
							className: "absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none",
							children: showPassword ? /* @__PURE__ */ jsx("svg", {
								xmlns: "http://www.w3.org/2000/svg",
								fill: "none",
								viewBox: "0 0 24 24",
								strokeWidth: 1.5,
								stroke: "currentColor",
								className: "w-5 h-5",
								children: /* @__PURE__ */ jsx("path", {
									strokeLinecap: "round",
									strokeLinejoin: "round",
									d: "M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
								})
							}) : /* @__PURE__ */ jsxs("svg", {
								xmlns: "http://www.w3.org/2000/svg",
								fill: "none",
								viewBox: "0 0 24 24",
								strokeWidth: 1.5,
								stroke: "currentColor",
								className: "w-5 h-5",
								children: [/* @__PURE__ */ jsx("path", {
									strokeLinecap: "round",
									strokeLinejoin: "round",
									d: "M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
								}), /* @__PURE__ */ jsx("path", {
									strokeLinecap: "round",
									strokeLinejoin: "round",
									d: "M15 12a3 3 0 11-6 0 3 3 0 016 0z"
								})]
							})
						})]
					})] }),
					/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
						className: "block text-sm font-medium text-slate-700 mb-1",
						children: "ยืนยันรหัสผ่านใหม่"
					}), /* @__PURE__ */ jsxs("div", {
						className: "relative",
						children: [/* @__PURE__ */ jsx("input", {
							type: showConfirmPassword ? "text" : "password",
							required: true,
							value: confirmPassword,
							onChange: (e) => {
								const val = e.target.value;
								if (!/[\u0E00-\u0E7F]/.test(val)) setConfirmPassword(val);
							},
							className: "w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none pr-12",
							placeholder: "กรอกรหัสผ่านอีกครั้ง",
							minLength: 8
						}), /* @__PURE__ */ jsx("button", {
							type: "button",
							onClick: () => setShowConfirmPassword(!showConfirmPassword),
							className: "absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none",
							children: showConfirmPassword ? /* @__PURE__ */ jsx("svg", {
								xmlns: "http://www.w3.org/2000/svg",
								fill: "none",
								viewBox: "0 0 24 24",
								strokeWidth: 1.5,
								stroke: "currentColor",
								className: "w-5 h-5",
								children: /* @__PURE__ */ jsx("path", {
									strokeLinecap: "round",
									strokeLinejoin: "round",
									d: "M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
								})
							}) : /* @__PURE__ */ jsxs("svg", {
								xmlns: "http://www.w3.org/2000/svg",
								fill: "none",
								viewBox: "0 0 24 24",
								strokeWidth: 1.5,
								stroke: "currentColor",
								className: "w-5 h-5",
								children: [/* @__PURE__ */ jsx("path", {
									strokeLinecap: "round",
									strokeLinejoin: "round",
									d: "M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
								}), /* @__PURE__ */ jsx("path", {
									strokeLinecap: "round",
									strokeLinejoin: "round",
									d: "M15 12a3 3 0 11-6 0 3 3 0 016 0z"
								})]
							})
						})]
					})] }),
					/* @__PURE__ */ jsx("button", {
						type: "submit",
						disabled: loading || !password || !confirmPassword,
						className: `w-full py-2 rounded-lg text-white font-medium transition-colors ${loading || !password || !confirmPassword ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`,
						children: loading ? "กำลังบันทึก..." : "บันทึกรหัสผ่านใหม่"
					})
				]
			})
		]
	});
}
var reset_password_default = UNSAFE_withComponentProps(ResetPassword);
//#endregion
//#region app/routes/register.jsx
var register_exports = /* @__PURE__ */ __exportAll({ default: () => register_default });
function Register() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const errorRef = useRef(null);
	const [success, setSuccess] = useState(false);
	const [needsEmailVerification, setNeedsEmailVerification] = useState(false);
	const [resendCooldown, setResendCooldown] = useState(0);
	const navigate = useNavigate();
	useEffect(() => {
		if (error && errorRef.current) {
			const y = errorRef.current.getBoundingClientRect().top + window.scrollY - 100;
			window.scrollTo({
				top: y,
				behavior: "smooth"
			});
		}
	}, [error]);
	useEffect(() => {
		let timer;
		if (resendCooldown > 0) timer = setInterval(() => {
			setResendCooldown((prev) => prev - 1);
		}, 1e3);
		return () => clearInterval(timer);
	}, [resendCooldown]);
	const handleResendVerification = async () => {
		if (resendCooldown > 0) return;
		setError(null);
		const { error } = await supabase.auth.resend({
			type: "signup",
			email,
			options: { emailRedirectTo: `${window.location.origin}/create` }
		});
		if (error) setError(translateError(error.message));
		else {
			setResendCooldown(60);
			alert("ส่งอีเมลยืนยันตัวตนใหม่อีกครั้งแล้ว กรุณาเช็คกล่องข้อความของคุณ");
		}
	};
	const handleRegister = async (e) => {
		e.preventDefault();
		setLoading(true);
		setError(null);
		if (password.length < 8) {
			setError("รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร");
			setLoading(false);
			return;
		}
		if (/[\u0E00-\u0E7F]/.test(password)) {
			setError("รหัสผ่านต้องเป็นภาษาอังกฤษ ห้ามมีภาษาไทย");
			setLoading(false);
			return;
		}
		const { data, error } = await supabase.auth.signUp({
			email,
			password,
			options: { emailRedirectTo: `${window.location.origin}/create` }
		});
		if (error) {
			setError(translateError(error.message));
			setLoading(false);
		} else if (data?.user && data?.session === null) {
			setSuccess(true);
			setNeedsEmailVerification(true);
			setLoading(false);
		} else {
			setSuccess(true);
			setTimeout(() => {
				navigate("/create");
			}, 2e3);
		}
	};
	const handleGoogleLogin = async () => {
		const { error } = await supabase.auth.signInWithOAuth({
			provider: "google",
			options: { redirectTo: `${window.location.origin}/create` }
		});
		if (error) setError(translateError(error.message));
	};
	return /* @__PURE__ */ jsxs(Fragment, { children: [
		/* @__PURE__ */ jsx("title", { children: "สมัครสมาชิกใหม่ | Auto Script" }),
		/* @__PURE__ */ jsx("meta", {
			name: "description",
			content: "สมัครสมาชิก Auto Script เริ่มต้นสร้างสคริปต์วิดีโอฟรี"
		}),
		/* @__PURE__ */ jsxs("div", {
			className: "max-w-md mx-auto mt-12 bg-white p-8 rounded-xl shadow-sm border border-slate-200",
			children: [
				/* @__PURE__ */ jsx("h2", {
					className: "text-2xl font-bold text-center text-slate-900 mb-6",
					children: "สมัครสมาชิกใหม่"
				}),
				error && /* @__PURE__ */ jsx("div", {
					ref: errorRef,
					className: "bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4",
					children: error
				}),
				success ? needsEmailVerification ? /* @__PURE__ */ jsxs("div", {
					className: "bg-blue-50 border border-blue-200 text-blue-800 p-6 rounded-xl text-center",
					children: [
						/* @__PURE__ */ jsx("div", {
							className: "flex justify-center mb-4",
							children: /* @__PURE__ */ jsx("svg", {
								className: "w-12 h-12 text-blue-500",
								fill: "none",
								stroke: "currentColor",
								viewBox: "0 0 24 24",
								children: /* @__PURE__ */ jsx("path", {
									strokeLinecap: "round",
									strokeLinejoin: "round",
									strokeWidth: "2",
									d: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
								})
							})
						}),
						/* @__PURE__ */ jsx("h3", {
							className: "text-xl font-bold mb-2",
							children: "เช็คอีเมลของคุณ! 📧"
						}),
						/* @__PURE__ */ jsxs("p", {
							className: "text-sm mb-4",
							children: [
								"เราได้ส่งลิงก์ยืนยันตัวตนไปที่ ",
								/* @__PURE__ */ jsx("br", {}),
								/* @__PURE__ */ jsx("strong", {
									className: "text-blue-900",
									children: email
								}),
								/* @__PURE__ */ jsx("br", {}),
								" กรุณากดลิงก์ในอีเมลเพื่อเข้าสู่ระบบ"
							]
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-4 text-sm font-semibold flex items-center justify-center gap-2",
							children: [/* @__PURE__ */ jsx("svg", {
								className: "w-5 h-5 text-red-500",
								fill: "none",
								stroke: "currentColor",
								viewBox: "0 0 24 24",
								children: /* @__PURE__ */ jsx("path", {
									strokeLinecap: "round",
									strokeLinejoin: "round",
									strokeWidth: "2",
									d: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
								})
							}), "สำคัญ: ถ้าไม่เจอให้ลองหาใน \"จดหมายขยะ (Spam)\" ดูนะครับ"]
						}),
						/* @__PURE__ */ jsxs("p", {
							className: "text-sm font-semibold text-blue-700 bg-blue-100 py-2 px-3 rounded-lg mt-4 flex flex-wrap justify-center gap-x-1",
							children: [/* @__PURE__ */ jsx("span", { children: "เมื่อยืนยันแล้ว" }), /* @__PURE__ */ jsx("span", { children: "สามารถกลับมาล็อกอินได้เลย" })]
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "mt-6 flex flex-col gap-3",
							children: [/* @__PURE__ */ jsx("button", {
								onClick: () => navigate("/login"),
								className: "w-full bg-blue-600 text-white font-bold py-2.5 rounded-lg hover:bg-blue-700 transition-colors shadow-sm",
								children: "ฉันยืนยันอีเมลแล้ว (ไปเข้าสู่ระบบ)"
							}), /* @__PURE__ */ jsx("button", {
								onClick: handleResendVerification,
								disabled: resendCooldown > 0,
								className: `w-full py-2 rounded-lg text-sm font-medium transition-colors ${resendCooldown > 0 ? "bg-slate-200 text-slate-500 cursor-not-allowed" : "bg-white border border-blue-300 text-blue-700 hover:bg-blue-50"}`,
								children: resendCooldown > 0 ? `รอส่งอีเมลใหม่อีกครั้ง (${resendCooldown}s)` : "ส่งอีเมลยืนยันตัวตนใหม่อีกครั้ง"
							})]
						})
					]
				}) : /* @__PURE__ */ jsxs("div", {
					className: "bg-green-50 text-green-700 p-4 rounded-lg text-center",
					children: [/* @__PURE__ */ jsx("p", {
						className: "font-bold mb-2",
						children: "สมัครสมาชิกสำเร็จ! 🎉"
					}), /* @__PURE__ */ jsx("p", {
						className: "text-sm",
						children: "กำลังพากลับไปหน้าสร้างสคริปต์..."
					})]
				}) : /* @__PURE__ */ jsxs(Fragment, { children: [
					/* @__PURE__ */ jsxs("button", {
						onClick: handleGoogleLogin,
						className: "w-full flex items-center justify-center gap-3 bg-white border border-slate-300 text-slate-700 px-4 py-2.5 rounded-lg font-medium hover:bg-slate-50 transition-colors mb-6 shadow-sm",
						children: [/* @__PURE__ */ jsxs("svg", {
							className: "w-5 h-5",
							viewBox: "0 0 24 24",
							children: [
								/* @__PURE__ */ jsx("path", {
									d: "M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z",
									fill: "#4285F4"
								}),
								/* @__PURE__ */ jsx("path", {
									d: "M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z",
									fill: "#34A853"
								}),
								/* @__PURE__ */ jsx("path", {
									d: "M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z",
									fill: "#FBBC05"
								}),
								/* @__PURE__ */ jsx("path", {
									d: "M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z",
									fill: "#EA4335"
								})
							]
						}), "สมัครด้วย Google"]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "relative flex items-center py-2 mb-4",
						children: [
							/* @__PURE__ */ jsx("div", { className: "flex-grow border-t border-slate-200" }),
							/* @__PURE__ */ jsx("span", {
								className: "flex-shrink-0 mx-4 text-slate-400 text-sm",
								children: "หรือใช้อีเมล"
							}),
							/* @__PURE__ */ jsx("div", { className: "flex-grow border-t border-slate-200" })
						]
					}),
					/* @__PURE__ */ jsxs("form", {
						onSubmit: handleRegister,
						className: "space-y-4",
						children: [
							/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
								className: "block text-sm font-medium text-slate-700 mb-1",
								children: "อีเมล"
							}), /* @__PURE__ */ jsx("input", {
								type: "email",
								required: true,
								value: email,
								onChange: (e) => setEmail(e.target.value),
								className: "w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none",
								placeholder: "your@email.com"
							})] }),
							/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
								className: "block text-sm font-medium text-slate-700 mb-1",
								children: "รหัสผ่าน (ขั้นต่ำ 8 ตัวอักษร)"
							}), /* @__PURE__ */ jsxs("div", {
								className: "relative",
								children: [/* @__PURE__ */ jsx("input", {
									type: showPassword ? "text" : "password",
									required: true,
									minLength: "8",
									value: password,
									onChange: (e) => {
										const val = e.target.value;
										if (!/[\u0E00-\u0E7F]/.test(val)) setPassword(val);
									},
									className: "w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none pr-12",
									placeholder: "••••••••"
								}), /* @__PURE__ */ jsx("button", {
									type: "button",
									onClick: () => setShowPassword(!showPassword),
									className: "absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none",
									children: showPassword ? /* @__PURE__ */ jsx("svg", {
										xmlns: "http://www.w3.org/2000/svg",
										fill: "none",
										viewBox: "0 0 24 24",
										strokeWidth: 1.5,
										stroke: "currentColor",
										className: "w-5 h-5",
										children: /* @__PURE__ */ jsx("path", {
											strokeLinecap: "round",
											strokeLinejoin: "round",
											d: "M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
										})
									}) : /* @__PURE__ */ jsxs("svg", {
										xmlns: "http://www.w3.org/2000/svg",
										fill: "none",
										viewBox: "0 0 24 24",
										strokeWidth: 1.5,
										stroke: "currentColor",
										className: "w-5 h-5",
										children: [/* @__PURE__ */ jsx("path", {
											strokeLinecap: "round",
											strokeLinejoin: "round",
											d: "M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
										}), /* @__PURE__ */ jsx("path", {
											strokeLinecap: "round",
											strokeLinejoin: "round",
											d: "M15 12a3 3 0 11-6 0 3 3 0 016 0z"
										})]
									})
								})]
							})] }),
							/* @__PURE__ */ jsxs("div", {
								className: "flex items-start mt-4",
								children: [/* @__PURE__ */ jsx("input", {
									id: "privacy",
									name: "privacy",
									type: "checkbox",
									required: true,
									className: "h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded mt-1 cursor-pointer"
								}), /* @__PURE__ */ jsxs("label", {
									htmlFor: "privacy",
									className: "ml-2 block text-sm text-slate-600 cursor-pointer",
									children: [
										"ฉันยอมรับ",
										" ",
										/* @__PURE__ */ jsx(Link, {
											to: "/legal",
											className: "text-blue-600 hover:underline",
											children: "เงื่อนไขการให้บริการ (Terms of Service)"
										}),
										" ",
										"และ",
										" ",
										/* @__PURE__ */ jsx(Link, {
											to: "/legal",
											className: "text-blue-600 hover:underline",
											children: "นโยบายความเป็นส่วนตัว (Privacy Policy)"
										})
									]
								})]
							}),
							/* @__PURE__ */ jsx("button", {
								type: "submit",
								disabled: loading,
								className: `w-full py-2 rounded-lg text-white font-medium transition-colors ${loading ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`,
								children: loading ? "กำลังสร้างบัญชี..." : "สมัครสมาชิก"
							})
						]
					})
				] }),
				!success && /* @__PURE__ */ jsxs("p", {
					className: "mt-6 text-center text-sm text-slate-600",
					children: [
						"มีบัญชีอยู่แล้ว?",
						" ",
						/* @__PURE__ */ jsx(Link, {
							to: "/login",
							className: "text-blue-600 hover:underline font-medium",
							children: "เข้าสู่ระบบ"
						})
					]
				})
			]
		})
	] });
}
var register_default = UNSAFE_withComponentProps(Register);
//#endregion
//#region app/routes/settings.jsx
var settings_exports = /* @__PURE__ */ __exportAll({ default: () => settings_default });
function Settings() {
	const { user, profile, loading, refreshProfile } = useAuth();
	const [displayName, setDisplayName] = useState("");
	const [isSaving, setIsSaving] = useState(false);
	const [isLoadingPortal, setIsLoadingPortal] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [showToast, setShowToast] = useState(false);
	const navigate = useNavigate();
	useEffect(() => {
		if (!loading && !user) navigate("/login");
	}, [
		user,
		loading,
		navigate
	]);
	useEffect(() => {
		if (user?.user_metadata?.full_name) setDisplayName(user.user_metadata.full_name);
		else if (profile?.display_name) setDisplayName(profile.display_name);
	}, [user, profile]);
	useEffect(() => {
		if (new URLSearchParams(window.location.search).get("upgraded") === "true") {
			setShowToast(true);
			refreshProfile();
			window.history.replaceState({}, document.title, window.location.pathname);
			setTimeout(() => setShowToast(false), 5e3);
		}
	}, [refreshProfile]);
	const handleUpdateName = async (e) => {
		e.preventDefault();
		setIsSaving(true);
		const { error } = await supabase.auth.updateUser({ data: { full_name: displayName } });
		setIsSaving(false);
		if (error) alert("เกิดข้อผิดพลาดในการบันทึกชื่อ");
		else {
			alert("บันทึกชื่อเรียบร้อยแล้ว!");
			refreshProfile();
		}
	};
	const handleManageSubscription = async () => {
		if (!profile?.stripe_customer_id) {
			alert("คุณยังไม่ได้สมัครแพ็กเกจใดๆ ครับ (คุณใช้งานแพ็กเกจฟรีอยู่)");
			return;
		}
		setIsLoadingPortal(true);
		try {
			const { data: { session } } = await supabase.auth.getSession();
			if (!session) {
				alert("กรุณาเข้าสู่ระบบใหม่อีกครั้ง");
				navigate("/login");
				return;
			}
			const data = await (await fetch("/api/create-portal", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Authorization": `Bearer ${session.access_token}`
				}
			})).json();
			if (data.url) window.location.href = data.url;
			else alert("ไม่สามารถสร้างลิงก์จัดการแพ็กเกจได้: " + (data.error || "Unknown error"));
		} catch (err) {
			console.error(err);
			alert("เกิดข้อผิดพลาดในการเชื่อมต่อ Stripe");
		} finally {
			setIsLoadingPortal(false);
		}
	};
	const handleDeleteAccount = async () => {
		if (!window.confirm("⚠️ คำเตือน: คุณต้องการลบบัญชีใช่หรือไม่? ประวัติสคริปต์ทั้งหมดจะถูกลบถาวร!")) return;
		if (!window.confirm("คุณแน่ใจ 100% ใช่ไหมครับ? การกระทำนี้ไม่สามารถย้อนกลับได้")) return;
		setIsDeleting(true);
		try {
			const res = await fetch("/api/delete-account", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Authorization": `Bearer ${(await supabase.auth.getSession()).data.session.access_token}`
				}
			});
			if (res.ok) {
				await supabase.auth.signOut();
				alert("ลบบัญชีเรียบร้อยแล้ว หวังว่าจะได้พบกันใหม่นะครับ!");
				navigate("/");
			} else {
				const errData = await res.text();
				alert("ไม่สามารถลบบัญชีได้: " + errData);
			}
		} catch {
			alert("เกิดข้อผิดพลาดในการลบบัญชี");
		} finally {
			setIsDeleting(false);
		}
	};
	if (!user || !profile) return /* @__PURE__ */ jsx("div", {
		className: "text-center py-20 text-slate-500",
		children: "กำลังโหลดข้อมูลบัญชี..."
	});
	return /* @__PURE__ */ jsxs("div", {
		className: "max-w-4xl mx-auto px-4 py-8 relative",
		children: [
			showToast && /* @__PURE__ */ jsxs("div", {
				className: "fixed top-20 right-4 md:right-8 bg-green-500 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 z-50 animate-[bounce_1s_ease-in-out]",
				children: [/* @__PURE__ */ jsx("svg", {
					className: "w-6 h-6",
					fill: "none",
					stroke: "currentColor",
					viewBox: "0 0 24 24",
					children: /* @__PURE__ */ jsx("path", {
						strokeLinecap: "round",
						strokeLinejoin: "round",
						strokeWidth: "2",
						d: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
					})
				}), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h4", {
					className: "font-bold",
					children: "ชำระเงินสำเร็จ! 🎉"
				}), /* @__PURE__ */ jsx("p", {
					className: "text-sm text-green-100",
					children: "อัปเกรดแพ็กเกจและเติมเครดิตเรียบร้อยแล้ว"
				})] })]
			}),
			/* @__PURE__ */ jsxs("button", {
				onClick: () => navigate("/create"),
				className: "flex items-center text-slate-500 hover:text-blue-600 font-medium mb-6 transition-colors",
				children: [/* @__PURE__ */ jsx("svg", {
					className: "w-5 h-5 mr-1",
					fill: "none",
					stroke: "currentColor",
					viewBox: "0 0 24 24",
					children: /* @__PURE__ */ jsx("path", {
						strokeLinecap: "round",
						strokeLinejoin: "round",
						strokeWidth: "2",
						d: "M10 19l-7-7m0 0l7-7m-7 7h18"
					})
				}), "กลับไปหน้าสร้างสคริปต์"]
			}),
			/* @__PURE__ */ jsx("h1", {
				className: "text-3xl font-extrabold text-slate-900 mb-8",
				children: "บัญชีผู้ใช้และการตั้งค่า"
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8",
				children: [/* @__PURE__ */ jsx("h2", {
					className: "text-xl font-semibold mb-4",
					children: "ข้อมูลส่วนตัว"
				}), /* @__PURE__ */ jsxs("form", {
					onSubmit: handleUpdateName,
					children: [
						/* @__PURE__ */ jsxs("div", {
							className: "mb-4",
							children: [/* @__PURE__ */ jsx("label", {
								className: "block text-sm font-medium text-slate-700 mb-2",
								children: "อีเมล (ไม่สามารถเปลี่ยนได้)"
							}), /* @__PURE__ */ jsx("input", {
								type: "text",
								disabled: true,
								value: user.email,
								className: "w-full px-4 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-500 cursor-not-allowed"
							})]
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "mb-4",
							children: [/* @__PURE__ */ jsx("label", {
								className: "block text-sm font-medium text-slate-700 mb-2",
								children: "ชื่อที่แสดง (Display Name)"
							}), /* @__PURE__ */ jsx("input", {
								type: "text",
								value: displayName,
								onChange: (e) => setDisplayName(e.target.value),
								placeholder: "กรอกชื่อของคุณ",
								maxLength: 50,
								className: "w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
							})]
						}),
						/* @__PURE__ */ jsx("button", {
							type: "submit",
							disabled: isSaving,
							className: "bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50",
							children: isSaving ? "กำลังบันทึก..." : "บันทึกชื่อ"
						})
					]
				})]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8",
				children: [
					/* @__PURE__ */ jsx("h2", {
						className: "text-xl font-semibold mb-4",
						children: "แพ็กเกจของคุณ"
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "flex flex-col md:flex-row items-center justify-between bg-slate-50 p-4 rounded-lg border border-slate-100 mb-4 gap-4",
						children: [/* @__PURE__ */ jsxs("div", {
							className: "flex flex-col sm:flex-row gap-4 w-full md:w-auto text-center sm:text-left",
							children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("p", {
								className: "text-sm text-slate-500 mb-1 whitespace-nowrap",
								children: "แผนปัจจุบัน (Plan)"
							}), /* @__PURE__ */ jsx("p", {
								className: "text-2xl font-bold uppercase text-blue-600",
								children: profile.tier
							})] }), profile.tier === "free" && profile.trial_pro_remaining > 0 && /* @__PURE__ */ jsxs("div", {
								className: "border-l border-slate-200 pl-4",
								children: [/* @__PURE__ */ jsx("p", {
									className: "text-sm text-purple-500 mb-1 whitespace-nowrap",
									children: "สิทธิ์ทดลอง Pro ฟรี"
								}), /* @__PURE__ */ jsxs("p", {
									className: "text-xl font-bold text-purple-700",
									children: [Math.min(profile.credits, profile.trial_pro_remaining), " ครั้ง"]
								})]
							})]
						}), /* @__PURE__ */ jsxs("div", {
							className: "text-center sm:text-right w-full md:w-auto",
							children: [
								/* @__PURE__ */ jsx("p", {
									className: "text-sm text-slate-500 mb-1 whitespace-nowrap",
									children: "เครดิตคงเหลือ"
								}),
								/* @__PURE__ */ jsx("p", {
									className: "text-2xl font-semibold",
									children: profile.credits
								}),
								profile.tier === "free" && profile.last_free_reset && /* @__PURE__ */ jsxs("p", {
									className: "text-xs text-slate-400 mt-1",
									children: ["รอบเติมเครดิตฟรีรอบถัดไป: ", new Date(new Date(profile.last_free_reset).getTime() + 6048e5).toLocaleDateString("th-TH")]
								})
							]
						})]
					}),
					/* @__PURE__ */ jsx("p", {
						className: "text-sm text-slate-600 mb-4",
						children: "หากคุณต้องการเปลี่ยนบัตรเครดิต, ดูประวัติการชำระเงิน, หรือยกเลิกบริการ สามารถเข้าไปจัดการได้ที่ระบบของ Stripe โดยตรงครับ"
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "flex flex-col sm:flex-row gap-3",
						children: [/* @__PURE__ */ jsx("button", {
							onClick: () => navigate("/pricing"),
							className: "bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 w-full sm:w-auto text-center",
							children: "ดูแพ็กเกจและอัปเกรด"
						}), profile.tier !== "free" && profile.stripe_customer_id && /* @__PURE__ */ jsx("button", {
							onClick: handleManageSubscription,
							disabled: isLoadingPortal,
							className: "bg-slate-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-slate-800 disabled:opacity-50 w-full sm:w-auto text-center",
							children: isLoadingPortal ? "กำลังติดต่อ Stripe..." : "จัดการการตัดบัตร / ยกเลิก"
						})]
					})
				]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "bg-red-50 p-6 rounded-xl border border-red-100",
				children: [
					/* @__PURE__ */ jsx("h2", {
						className: "text-xl font-semibold text-red-700 mb-2",
						children: "ลบบัญชี (Danger Zone)"
					}),
					/* @__PURE__ */ jsx("p", {
						className: "text-sm text-red-600 mb-4",
						children: "การลบบัญชีจะทำให้ข้อมูลทั้งหมด (รวมถึงสคริปต์ที่คุณเคยสร้างไว้) หายไปอย่างถาวรและไม่สามารถกู้คืนได้"
					}),
					/* @__PURE__ */ jsx("button", {
						onClick: handleDeleteAccount,
						disabled: isDeleting,
						className: "bg-red-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50",
						children: isDeleting ? "กำลังลบข้อมูล..." : "ลบบัญชีของฉันอย่างถาวร"
					})
				]
			})
		]
	});
}
var settings_default = UNSAFE_withComponentProps(Settings);
//#endregion
//#region app/routes/history.jsx
var history_exports = /* @__PURE__ */ __exportAll({ default: () => history_default });
function History() {
	const { user, profile, loading: authLoading } = useAuth();
	const [scripts, setScripts] = useState([]);
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState("");
	const [filterMode, setFilterMode] = useState("all");
	const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
	const [selectedScript, setSelectedScript] = useState(null);
	const [activeModalTab, setActiveModalTab] = useState("funny");
	const [isDeleteMode, setIsDeleteMode] = useState(false);
	const [selectedIds, setSelectedIds] = useState(/* @__PURE__ */ new Set());
	const [isDeleting, setIsDeleting] = useState(false);
	const navigate = useNavigate();
	const loadHistory = async (userId) => {
		setLoading(true);
		const { data, error } = await supabase.from("scripts").select("*").eq("user_id", userId).order("created_at", { ascending: false });
		if (!error && data) {
			const nameCounts = {};
			data.forEach((s) => {
				nameCounts[s.product_name] = (nameCounts[s.product_name] || 0) + 1;
			});
			const currentCounts = {};
			const processedData = [...data].reverse().map((s) => {
				currentCounts[s.product_name] = (currentCounts[s.product_name] || 0) + 1;
				return {
					...s,
					versionIndex: currentCounts[s.product_name],
					totalVersions: nameCounts[s.product_name]
				};
			}).reverse();
			setScripts(processedData);
		}
		setLoading(false);
	};
	useEffect(() => {
		if (!authLoading && !user) {
			navigate("/login");
			return;
		}
		if (user) loadHistory(user.id);
	}, [
		user,
		authLoading,
		navigate
	]);
	const toggleFavorite = async (scriptId, currentStatus) => {
		setScripts(scripts.map((s) => s.id === scriptId ? {
			...s,
			is_favorite: !currentStatus
		} : s));
		await supabase.from("scripts").update({ is_favorite: !currentStatus }).eq("id", scriptId);
	};
	const toggleSelectId = (id) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};
	const toggleSelectAll = () => {
		if (selectedIds.size === filteredScriptsForDelete.length) setSelectedIds(/* @__PURE__ */ new Set());
		else setSelectedIds(new Set(filteredScriptsForDelete.map((s) => s.id)));
	};
	const exitDeleteMode = () => {
		setIsDeleteMode(false);
		setSelectedIds(/* @__PURE__ */ new Set());
	};
	const handleDeleteSelected = async () => {
		if (selectedIds.size === 0) return;
		setIsDeleting(true);
		const idsToDelete = [...selectedIds];
		const { error } = await supabase.from("scripts").delete().in("id", idsToDelete).eq("user_id", user.id);
		if (!error) {
			setScripts((prev) => prev.filter((s) => !idsToDelete.includes(s.id)));
			exitDeleteMode();
		}
		setIsDeleting(false);
	};
	const getRetentionLabel = () => {
		const tier = profile?.tier || "free";
		if (tier === "pro") return null;
		if (tier === "plus") return {
			days: 30,
			color: "blue"
		};
		return {
			days: 3,
			color: "amber"
		};
	};
	const retentionInfo = getRetentionLabel();
	const parseMultiVersion = (rawMultiVersion) => {
		const safeParse = (str) => {
			try {
				return JSON.parse(str.replace(/```json/g, "").replace(/```/g, "").trim());
			} catch (e) {
				return null;
			}
		};
		const funnyMatch = rawMultiVersion.match(/<VERSION_FUNNY>([\s\S]*?)<\/VERSION_FUNNY>/);
		const reviewMatch = rawMultiVersion.match(/<VERSION_REVIEW>([\s\S]*?)<\/VERSION_REVIEW>/);
		const fomoMatch = rawMultiVersion.match(/<VERSION_FOMO>([\s\S]*?)<\/VERSION_FOMO>/);
		return {
			funny: funnyMatch ? safeParse(funnyMatch[1]) : null,
			review: reviewMatch ? safeParse(reviewMatch[1]) : null,
			fomo: fomoMatch ? safeParse(fomoMatch[1]) : null
		};
	};
	const copyToClipboard = (scriptData) => {
		try {
			let fullText = "";
			if (scriptData?.raw_multi_version) {
				const parsedMulti = parseMultiVersion(scriptData.raw_multi_version);
				const getBlocksText = (obj, title) => {
					if (!obj?.script_blocks) return "";
					return `--- ${title} ---\n` + obj.script_blocks.map((b) => b.audio_spoken).join(" ") + "\n\n";
				};
				fullText += getBlocksText(parsedMulti.funny, "สายฮา/กวนๆ");
				fullText += getBlocksText(parsedMulti.review, "รีวิวจริงใจ");
				fullText += getBlocksText(parsedMulti.fomo, "เร่งด่วน (FOMO)");
				if (!fullText.trim()) throw new Error("No blocks");
			} else {
				if (!scriptData?.script_blocks) {
					alert("ไม่พบข้อมูลบทพูดสำหรับคัดลอก");
					return;
				}
				fullText = scriptData.script_blocks.map((b) => b.audio_spoken).join(" ");
			}
			navigator.clipboard.writeText(fullText.trim());
			alert("คัดลอกสคริปต์เรียบร้อยแล้ว!");
		} catch {
			alert("ไม่สามารถคัดลอกได้");
		}
	};
	const exportToText = (scriptData, productName) => {
		let fullText = "";
		if (scriptData?.raw_multi_version) {
			const parsedMulti = parseMultiVersion(scriptData.raw_multi_version);
			const getBlocksText = (obj, title) => {
				if (!obj?.script_blocks) return "";
				return `=== ${title} ===\n` + obj.script_blocks.map((b) => `[${b.phase}] ${b.audio_spoken}\n(ภาพ: ${b.visual_direction})`).join("\n\n") + "\n\n";
			};
			fullText += getBlocksText(parsedMulti.funny, "สายฮา/กวนๆ");
			fullText += getBlocksText(parsedMulti.review, "รีวิวจริงใจ");
			fullText += getBlocksText(parsedMulti.fomo, "เร่งด่วน (FOMO)");
		} else {
			if (!scriptData?.script_blocks) return;
			fullText = scriptData.script_blocks.map((b) => `[${b.phase}] ${b.audio_spoken}\n(ภาพ: ${b.visual_direction})`).join("\n\n");
		}
		const blob = new Blob([fullText.trim()], { type: "text/plain;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `Script_${productName}.txt`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};
	const filteredScripts = scripts.filter((s) => {
		const matchSearch = s.product_name.toLowerCase().includes(searchTerm.toLowerCase());
		const matchMode = filterMode === "all" || s.mode === filterMode;
		const matchFavorite = !showFavoritesOnly || s.is_favorite;
		return matchSearch && matchMode && matchFavorite;
	});
	const filteredScriptsForDelete = filteredScripts.filter((s) => !s.is_favorite);
	const allDeleteSelected = filteredScriptsForDelete.length > 0 && selectedIds.size === filteredScriptsForDelete.length;
	const uniqueModes = ["all", ...Array.from(new Set(scripts.map((s) => s.mode)))];
	const formatModeDisplay = (modeStr) => {
		if (modeStr === "all") return "ทุกโหมด";
		if (modeStr === "Pro_MultiVersion") return "Multi-Version (3 สไตล์)";
		return modeStr;
	};
	return /* @__PURE__ */ jsxs("div", {
		className: "max-w-6xl mx-auto py-6 sm:py-8 px-4 sm:px-6",
		children: [
			/* @__PURE__ */ jsxs("button", {
				onClick: () => window.history.back(),
				className: "flex items-center text-slate-500 hover:text-blue-600 font-medium mb-6 transition-colors",
				children: [/* @__PURE__ */ jsx("svg", {
					className: "w-5 h-5 mr-1",
					fill: "none",
					stroke: "currentColor",
					viewBox: "0 0 24 24",
					children: /* @__PURE__ */ jsx("path", {
						strokeLinecap: "round",
						strokeLinejoin: "round",
						strokeWidth: "2",
						d: "M10 19l-7-7m0 0l7-7m-7 7h18"
					})
				}), "ย้อนกลับ"]
			}),
			retentionInfo && /* @__PURE__ */ jsxs("div", {
				className: `flex items-start gap-3 mb-5 p-3.5 rounded-xl border text-sm ${retentionInfo.color === "amber" ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-blue-50 border-blue-200 text-blue-800"}`,
				children: [/* @__PURE__ */ jsx("svg", {
					className: "w-5 h-5 shrink-0 mt-0.5",
					fill: "none",
					stroke: "currentColor",
					viewBox: "0 0 24 24",
					children: /* @__PURE__ */ jsx("path", {
						strokeLinecap: "round",
						strokeLinejoin: "round",
						strokeWidth: "2",
						d: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
					})
				}), /* @__PURE__ */ jsxs("span", { children: [
					"สคริปต์ที่ไม่ได้บันทึกเป็นรายการโปรด จะถูกลบอัตโนมัติหลังจาก ",
					/* @__PURE__ */ jsxs("strong", { children: [retentionInfo.days, " วัน"] }),
					" ",
					retentionInfo.color === "amber" && /* @__PURE__ */ jsxs("span", { children: [
						"— ",
						/* @__PURE__ */ jsx("a", {
							href: "/pricing",
							className: "underline font-medium",
							children: "อัปเกรดแพลน"
						}),
						" เพื่อเก็บนานขึ้น"
					] })
				] })]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4",
				children: [/* @__PURE__ */ jsxs("h1", {
					className: "text-3xl font-bold text-slate-900 mb-4 md:mb-0 flex items-center gap-2",
					children: ["ประวัติการสร้างสคริปต์", /* @__PURE__ */ jsx("svg", {
						className: "w-8 h-8 text-blue-500",
						fill: "none",
						stroke: "currentColor",
						viewBox: "0 0 24 24",
						children: /* @__PURE__ */ jsx("path", {
							strokeLinecap: "round",
							strokeLinejoin: "round",
							strokeWidth: "2",
							d: "M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"
						})
					})]
				}), /* @__PURE__ */ jsxs("div", {
					className: "flex flex-col sm:flex-row gap-3 w-full md:w-auto",
					children: [!isDeleteMode && /* @__PURE__ */ jsxs(Fragment, { children: [
						/* @__PURE__ */ jsx("input", {
							type: "text",
							placeholder: "ค้นหาชื่อสินค้า...",
							value: searchTerm,
							onChange: (e) => setSearchTerm(e.target.value),
							className: "px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
						}),
						/* @__PURE__ */ jsx("div", {
							className: "flex bg-slate-100 p-1 rounded-lg overflow-x-auto hide-scrollbar shrink-0",
							children: uniqueModes.map((modeId) => /* @__PURE__ */ jsx("button", {
								onClick: () => setFilterMode(modeId),
								className: `whitespace-nowrap px-4 py-1.5 text-sm font-medium rounded-md transition-all ${filterMode === modeId ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"}`,
								children: formatModeDisplay(modeId)
							}, modeId))
						}),
						/* @__PURE__ */ jsx("button", {
							onClick: () => setShowFavoritesOnly(!showFavoritesOnly),
							className: `px-4 py-2 rounded-lg font-medium transition-colors border ${showFavoritesOnly ? "bg-amber-100 border-amber-300 text-amber-700" : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"}`,
							children: showFavoritesOnly ? /* @__PURE__ */ jsxs("span", {
								className: "flex items-center gap-1",
								children: [/* @__PURE__ */ jsx("svg", {
									className: "w-4 h-4 text-amber-500",
									fill: "currentColor",
									viewBox: "0 0 20 20",
									children: /* @__PURE__ */ jsx("path", { d: "M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" })
								}), " เฉพาะรายการโปรด"]
							}) : /* @__PURE__ */ jsxs("span", {
								className: "flex items-center gap-1",
								children: [/* @__PURE__ */ jsx("svg", {
									className: "w-4 h-4 text-slate-400",
									fill: "none",
									stroke: "currentColor",
									viewBox: "0 0 24 24",
									children: /* @__PURE__ */ jsx("path", {
										strokeLinecap: "round",
										strokeLinejoin: "round",
										strokeWidth: "2",
										d: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
									})
								}), " ดูรายการโปรด"]
							})
						}),
						scripts.length > 0 && /* @__PURE__ */ jsxs("button", {
							onClick: () => setIsDeleteMode(true),
							className: "flex items-center gap-2 px-4 py-2 rounded-lg font-medium border border-rose-200 text-rose-600 bg-white hover:bg-rose-50 transition-colors shrink-0",
							children: [/* @__PURE__ */ jsx("svg", {
								className: "w-4 h-4",
								fill: "none",
								stroke: "currentColor",
								viewBox: "0 0 24 24",
								children: /* @__PURE__ */ jsx("path", {
									strokeLinecap: "round",
									strokeLinejoin: "round",
									strokeWidth: "2",
									d: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
								})
							}), "เลือกลบ"]
						})
					] }), isDeleteMode && /* @__PURE__ */ jsxs("div", {
						className: "flex items-center gap-3 w-full",
						children: [
							/* @__PURE__ */ jsxs("label", {
								className: "flex items-center gap-2 cursor-pointer select-none text-sm font-medium text-slate-700 shrink-0",
								children: [
									/* @__PURE__ */ jsx("input", {
										type: "checkbox",
										checked: allDeleteSelected,
										onChange: toggleSelectAll,
										className: "w-4 h-4 rounded border-slate-300 text-rose-600 cursor-pointer accent-rose-600"
									}),
									"เลือกทั้งหมด (",
									filteredScriptsForDelete.length,
									")"
								]
							}),
							/* @__PURE__ */ jsx("div", { className: "flex-1" }),
							/* @__PURE__ */ jsxs("button", {
								onClick: handleDeleteSelected,
								disabled: selectedIds.size === 0 || isDeleting,
								className: "flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors",
								children: [/* @__PURE__ */ jsx("svg", {
									className: "w-4 h-4",
									fill: "none",
									stroke: "currentColor",
									viewBox: "0 0 24 24",
									children: /* @__PURE__ */ jsx("path", {
										strokeLinecap: "round",
										strokeLinejoin: "round",
										strokeWidth: "2",
										d: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
									})
								}), isDeleting ? "กำลังลบ..." : `ลบที่เลือก${selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}`]
							}),
							/* @__PURE__ */ jsxs("button", {
								onClick: exitDeleteMode,
								className: "flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm border border-slate-300 text-slate-600 bg-white hover:bg-slate-50 transition-colors",
								children: [/* @__PURE__ */ jsx("svg", {
									className: "w-4 h-4",
									fill: "none",
									stroke: "currentColor",
									viewBox: "0 0 24 24",
									children: /* @__PURE__ */ jsx("path", {
										strokeLinecap: "round",
										strokeLinejoin: "round",
										strokeWidth: "2",
										d: "M6 18L18 6M6 6l12 12"
									})
								}), "ยกเลิก"]
							})
						]
					})]
				})]
			}),
			loading ? /* @__PURE__ */ jsx("div", {
				className: "text-center py-20 text-slate-500",
				children: "กำลังโหลดข้อมูล..."
			}) : filteredScripts.length === 0 ? /* @__PURE__ */ jsxs("div", {
				className: "bg-white p-12 rounded-xl border border-slate-200 text-center shadow-sm",
				children: [
					/* @__PURE__ */ jsx("span", {
						className: "mb-4 flex justify-center text-slate-300",
						children: /* @__PURE__ */ jsx("svg", {
							className: "w-16 h-16",
							fill: "none",
							stroke: "currentColor",
							viewBox: "0 0 24 24",
							children: /* @__PURE__ */ jsx("path", {
								strokeLinecap: "round",
								strokeLinejoin: "round",
								strokeWidth: "1.5",
								d: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
							})
						})
					}),
					/* @__PURE__ */ jsx("h3", {
						className: "text-xl font-bold text-slate-800 mb-2",
						children: "ไม่พบสคริปต์"
					}),
					/* @__PURE__ */ jsx("p", {
						className: "text-slate-500",
						children: "คุณยังไม่ได้สร้างสคริปต์ หรือไม่มีข้อมูลที่ตรงกับการค้นหา"
					})
				]
			}) : /* @__PURE__ */ jsx("div", {
				className: "flex flex-col gap-3",
				children: filteredScripts.map((script) => {
					const isSelected = selectedIds.has(script.id);
					const isDeletable = !script.is_favorite;
					return /* @__PURE__ */ jsxs("div", {
						onClick: () => {
							if (isDeleteMode) {
								if (isDeletable) toggleSelectId(script.id);
							} else {
								setSelectedScript(script);
								setActiveModalTab("funny");
							}
						},
						className: `bg-white rounded-xl shadow-sm border p-4 transition-all cursor-pointer flex items-center gap-3 ${isDeleteMode && isSelected ? "border-rose-300 bg-rose-50 shadow-rose-100" : isDeleteMode && !isDeletable ? "border-slate-100 opacity-50 cursor-not-allowed" : "border-slate-200 hover:shadow-md"}`,
						children: [
							isDeleteMode && /* @__PURE__ */ jsx("div", {
								className: "shrink-0",
								onClick: (e) => e.stopPropagation(),
								children: isDeletable ? /* @__PURE__ */ jsx("input", {
									type: "checkbox",
									checked: isSelected,
									onChange: () => toggleSelectId(script.id),
									className: "w-5 h-5 rounded border-slate-300 cursor-pointer accent-rose-600"
								}) : /* @__PURE__ */ jsx("div", {
									className: "w-5 h-5 flex items-center justify-center",
									title: "รายการโปรด — ไม่สามารถลบได้",
									children: /* @__PURE__ */ jsx("svg", {
										className: "w-4 h-4 text-amber-400",
										fill: "currentColor",
										viewBox: "0 0 20 20",
										children: /* @__PURE__ */ jsx("path", { d: "M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" })
									})
								})
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "flex-1 min-w-0 pr-2",
								children: [/* @__PURE__ */ jsx("h3", {
									className: "text-base font-bold text-slate-900 truncate flex items-center gap-2",
									children: /* @__PURE__ */ jsx("span", {
										className: "truncate",
										children: script.product_name
									})
								}), /* @__PURE__ */ jsxs("div", {
									className: "flex flex-wrap items-center gap-2 mt-1.5",
									children: [
										script.totalVersions > 1 && /* @__PURE__ */ jsxs("span", {
											className: "text-[10px] sm:text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200 whitespace-nowrap",
											children: ["ครั้งที่ ", script.versionIndex]
										}),
										/* @__PURE__ */ jsx("span", {
											className: "text-[10px] sm:text-xs font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full whitespace-nowrap border border-blue-100",
											children: formatModeDisplay(script.mode)
										}),
										/* @__PURE__ */ jsx("span", {
											className: "text-[10px] sm:text-xs text-slate-500 whitespace-nowrap",
											children: new Date(script.created_at).toLocaleDateString("th-TH", {
												year: "2-digit",
												month: "short",
												day: "numeric"
											})
										})
									]
								})]
							}),
							!isDeleteMode && /* @__PURE__ */ jsx("button", {
								onClick: (e) => {
									e.stopPropagation();
									toggleFavorite(script.id, script.is_favorite);
								},
								className: "p-2 -mr-2 hover:scale-110 transition-transform shrink-0",
								title: "บันทึกเป็นรายการโปรด",
								children: script.is_favorite ? /* @__PURE__ */ jsx("svg", {
									className: "w-6 h-6 text-amber-400",
									fill: "currentColor",
									viewBox: "0 0 20 20",
									children: /* @__PURE__ */ jsx("path", { d: "M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" })
								}) : /* @__PURE__ */ jsx("svg", {
									className: "w-6 h-6 text-slate-300 hover:text-amber-400",
									fill: "none",
									stroke: "currentColor",
									viewBox: "0 0 24 24",
									children: /* @__PURE__ */ jsx("path", {
										strokeLinecap: "round",
										strokeLinejoin: "round",
										strokeWidth: "2",
										d: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
									})
								})
							})
						]
					}, script.id);
				})
			}),
			selectedScript && (() => {
				let parsed = null;
				let isMultiVersion = false;
				let parsedMulti = null;
				try {
					parsed = typeof selectedScript.content === "string" ? JSON.parse(selectedScript.content) : selectedScript.content;
					if (parsed?.raw_multi_version) {
						isMultiVersion = true;
						parsedMulti = parseMultiVersion(parsed.raw_multi_version);
					}
				} catch (e) {}
				return /* @__PURE__ */ jsx("div", {
					className: "fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm",
					onClick: () => setSelectedScript(null),
					children: /* @__PURE__ */ jsxs("div", {
						className: "bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden",
						onClick: (e) => e.stopPropagation(),
						children: [
							/* @__PURE__ */ jsxs("div", {
								className: "p-5 border-b border-slate-100 flex flex-col gap-4 bg-white z-10",
								children: [/* @__PURE__ */ jsxs("div", {
									className: "flex justify-between items-start",
									children: [/* @__PURE__ */ jsxs("div", {
										className: "pr-4",
										children: [/* @__PURE__ */ jsx("h2", {
											className: "text-xl font-bold text-slate-900 mb-2",
											children: selectedScript.product_name
										}), /* @__PURE__ */ jsxs("div", {
											className: "flex flex-wrap items-center gap-2",
											children: [
												/* @__PURE__ */ jsx("span", {
													className: "text-xs font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100",
													children: formatModeDisplay(selectedScript.mode)
												}),
												selectedScript.totalVersions > 1 && /* @__PURE__ */ jsxs("span", {
													className: "text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200",
													children: ["ครั้งที่ ", selectedScript.versionIndex]
												}),
												/* @__PURE__ */ jsxs("span", {
													className: "text-xs text-slate-500",
													children: [new Date(selectedScript.created_at).toLocaleString("th-TH", {
														year: "numeric",
														month: "short",
														day: "numeric",
														hour: "2-digit",
														minute: "2-digit"
													}), " น."]
												})
											]
										})]
									}), /* @__PURE__ */ jsx("button", {
										onClick: () => setSelectedScript(null),
										className: "p-2 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors shrink-0",
										children: /* @__PURE__ */ jsx("svg", {
											className: "w-5 h-5",
											fill: "none",
											stroke: "currentColor",
											viewBox: "0 0 24 24",
											children: /* @__PURE__ */ jsx("path", {
												strokeLinecap: "round",
												strokeLinejoin: "round",
												strokeWidth: "2",
												d: "M6 18L18 6M6 6l12 12"
											})
										})
									})]
								}), isMultiVersion && /* @__PURE__ */ jsxs("div", {
									className: "flex bg-slate-100 p-1 rounded-lg overflow-x-auto hide-scrollbar shrink-0",
									children: [
										/* @__PURE__ */ jsxs("button", {
											onClick: () => setActiveModalTab("funny"),
											className: `flex-1 whitespace-nowrap px-3 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-1.5 ${activeModalTab === "funny" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-900"}`,
											children: [/* @__PURE__ */ jsx("svg", {
												xmlns: "http://www.w3.org/2000/svg",
												viewBox: "0 0 24 24",
												fill: "currentColor",
												className: "w-4 h-4 text-amber-500",
												children: /* @__PURE__ */ jsx("path", {
													fillRule: "evenodd",
													d: "M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm-2.625 6c-.54 0-.828.419-.936.634a1.96 1.96 0 0 0-.189.866c0 .298.059.605.189.866.108.215.395.634.936.634.54 0 .828-.419.936-.634.13-.26.189-.568.189-.866 0-.298-.059-.605-.189-.866-.108-.215-.395-.634-.936-.634Zm4.314.634c.108-.215.395-.634.936-.634.54 0 .828.419.936.634.13.26.189.568.189.866 0 .298-.059.605-.189.866-.108.215-.395.634-.936.634-.54 0-.828-.419-.936-.634a1.96 1.96 0 0 1-.189-.866c0-.298.059-.605.189-.866ZM7.65 15.385a.75.75 0 0 1 1.06-.062 3.736 3.736 0 0 0 2.665 1.099h1.25a3.736 3.736 0 0 0 2.665-1.099.75.75 0 1 1 1.06 1.06 5.236 5.236 0 0 1-3.725 1.539h-1.25a5.236 5.236 0 0 1-3.725-1.539.75.75 0 0 1-.061-1.06Z",
													clipRule: "evenodd"
												})
											}), "สายฮา"]
										}),
										/* @__PURE__ */ jsxs("button", {
											onClick: () => setActiveModalTab("review"),
											className: `flex-1 whitespace-nowrap px-3 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-1.5 ${activeModalTab === "review" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-900"}`,
											children: [/* @__PURE__ */ jsx("svg", {
												xmlns: "http://www.w3.org/2000/svg",
												viewBox: "0 0 24 24",
												fill: "currentColor",
												className: "w-4 h-4 text-blue-500",
												children: /* @__PURE__ */ jsx("path", {
													fillRule: "evenodd",
													d: "M8.603 3.799A4.49 4.49 0 0 1 12 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 0 1 3.498 1.307 4.491 4.491 0 0 1 1.307 3.497A4.49 4.49 0 0 1 21.75 12a4.49 4.49 0 0 1-1.549 3.397 4.491 4.491 0 0 1-1.307 3.497 4.491 4.491 0 0 1-3.497 1.307A4.49 4.49 0 0 1 12 21.75a4.49 4.49 0 0 1-3.397-1.549 4.49 4.49 0 0 1-3.498-1.306 4.491 4.491 0 0 1-1.307-3.498A4.49 4.49 0 0 1 2.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 0 1 1.307-3.497 4.49 4.49 0 0 1 3.497-1.307Zm7.007 6.387a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z",
													clipRule: "evenodd"
												})
											}), "รีวิว"]
										}),
										/* @__PURE__ */ jsxs("button", {
											onClick: () => setActiveModalTab("fomo"),
											className: `flex-1 whitespace-nowrap px-3 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-1.5 ${activeModalTab === "fomo" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-900"}`,
											children: [/* @__PURE__ */ jsx("svg", {
												xmlns: "http://www.w3.org/2000/svg",
												viewBox: "0 0 24 24",
												fill: "currentColor",
												className: "w-4 h-4 text-rose-500",
												children: /* @__PURE__ */ jsx("path", {
													fillRule: "evenodd",
													d: "M12.963 2.286a.75.75 0 0 0-1.071-.136 9.742 9.742 0 0 0-3.539 6.176 7.547 7.547 0 0 1-1.705-1.715.75.75 0 0 0-1.152-.082A9 9 0 1 0 15.68 4.534a7.46 7.46 0 0 1-2.717-2.248ZM15.75 14.25a3.75 3.75 0 1 1-7.313-1.172c.628.465 1.35.81 2.133 1a5.99 5.99 0 0 1 1.925-3.546 3.75 3.75 0 0 1 3.255 3.718Z",
													clipRule: "evenodd"
												})
											}), "FOMO"]
										})
									]
								})]
							}),
							/* @__PURE__ */ jsx("div", {
								className: "p-5 overflow-y-auto flex-1 bg-slate-50 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap",
								children: (() => {
									if (isMultiVersion && parsedMulti) {
										const renderMultiVersionBlocks = (blocks, title, icon) => {
											if (!blocks || !blocks.script_blocks) return /* @__PURE__ */ jsx("div", {
												className: "text-center py-10 text-slate-400",
												children: "ไม่มีข้อมูลสคริปต์ส่วนนี้"
											});
											return /* @__PURE__ */ jsxs("div", {
												className: "bg-white p-4 rounded-xl border border-slate-200 shadow-sm animate-fade-in",
												children: [/* @__PURE__ */ jsxs("h4", {
													className: "font-bold text-slate-800 mb-3 flex items-center gap-2 border-b border-slate-100 pb-2",
													children: [
														icon,
														" ",
														title
													]
												}), /* @__PURE__ */ jsx("div", {
													className: "space-y-4",
													children: blocks.script_blocks.map((b, i) => /* @__PURE__ */ jsxs("div", {
														className: "border-b border-slate-50 last:border-0 pb-3 last:pb-0",
														children: [
															/* @__PURE__ */ jsx("div", {
																className: "font-semibold text-slate-800 mb-1 flex items-center gap-2",
																children: /* @__PURE__ */ jsx("span", {
																	className: "bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-xs",
																	children: b.phase
																})
															}),
															/* @__PURE__ */ jsx("p", {
																className: "mb-2 text-slate-700 text-sm",
																children: b.audio_spoken
															}),
															/* @__PURE__ */ jsxs("p", {
																className: "text-xs text-slate-500 italic bg-slate-50 p-2 rounded border border-slate-100",
																children: ["🎥 ภาพ: ", b.visual_direction]
															})
														]
													}, i))
												})]
											});
										};
										if (activeModalTab === "funny") return renderMultiVersionBlocks(parsedMulti.funny, "สายฮา/กวนๆ", /* @__PURE__ */ jsx("svg", {
											xmlns: "http://www.w3.org/2000/svg",
											viewBox: "0 0 24 24",
											fill: "currentColor",
											className: "w-5 h-5 text-amber-500",
											children: /* @__PURE__ */ jsx("path", {
												fillRule: "evenodd",
												d: "M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm-2.625 6c-.54 0-.828.419-.936.634a1.96 1.96 0 0 0-.189.866c0 .298.059.605.189.866.108.215.395.634.936.634.54 0 .828-.419.936-.634.13-.26.189-.568.189-.866 0-.298-.059-.605-.189-.866-.108-.215-.395-.634-.936-.634Zm4.314.634c.108-.215.395-.634.936-.634.54 0 .828.419.936.634.13.26.189.568.189.866 0 .298-.059.605-.189.866-.108.215-.395.634-.936.634-.54 0-.828-.419-.936-.634a1.96 1.96 0 0 1-.189-.866c0-.298.059-.605.189-.866ZM7.65 15.385a.75.75 0 0 1 1.06-.062 3.736 3.736 0 0 0 2.665 1.099h1.25a3.736 3.736 0 0 0 2.665-1.099.75.75 0 1 1 1.06 1.06 5.236 5.236 0 0 1-3.725 1.539h-1.25a5.236 5.236 0 0 1-3.725-1.539.75.75 0 0 1-.061-1.06Z",
												clipRule: "evenodd"
											})
										}));
										if (activeModalTab === "review") return renderMultiVersionBlocks(parsedMulti.review, "รีวิวจริงใจ", /* @__PURE__ */ jsx("svg", {
											xmlns: "http://www.w3.org/2000/svg",
											viewBox: "0 0 24 24",
											fill: "currentColor",
											className: "w-5 h-5 text-blue-500",
											children: /* @__PURE__ */ jsx("path", {
												fillRule: "evenodd",
												d: "M8.603 3.799A4.49 4.49 0 0 1 12 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 0 1 3.498 1.307 4.491 4.491 0 0 1 1.307 3.497A4.49 4.49 0 0 1 21.75 12a4.49 4.49 0 0 1-1.549 3.397 4.491 4.491 0 0 1-1.307 3.497 4.491 4.491 0 0 1-3.497 1.307A4.49 4.49 0 0 1 12 21.75a4.49 4.49 0 0 1-3.397-1.549 4.49 4.49 0 0 1-3.498-1.306 4.491 4.491 0 0 1-1.307-3.498A4.49 4.49 0 0 1 2.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 0 1 1.307-3.497 4.49 4.49 0 0 1 3.497-1.307Zm7.007 6.387a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z",
												clipRule: "evenodd"
											})
										}));
										if (activeModalTab === "fomo") return renderMultiVersionBlocks(parsedMulti.fomo, "เร่งด่วน (FOMO)", /* @__PURE__ */ jsx("svg", {
											xmlns: "http://www.w3.org/2000/svg",
											viewBox: "0 0 24 24",
											fill: "currentColor",
											className: "w-5 h-5 text-rose-500",
											children: /* @__PURE__ */ jsx("path", {
												fillRule: "evenodd",
												d: "M12.963 2.286a.75.75 0 0 0-1.071-.136 9.742 9.742 0 0 0-3.539 6.176 7.547 7.547 0 0 1-1.705-1.715.75.75 0 0 0-1.152-.082A9 9 0 1 0 15.68 4.534a7.46 7.46 0 0 1-2.717-2.248ZM15.75 14.25a3.75 3.75 0 1 1-7.313-1.172c.628.465 1.35.81 2.133 1a5.99 5.99 0 0 1 1.925-3.546 3.75 3.75 0 0 1 3.255 3.718Z",
												clipRule: "evenodd"
											})
										}));
										return null;
									} else if (parsed?.script_blocks) return /* @__PURE__ */ jsx("div", {
										className: "bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4",
										children: parsed.script_blocks.map((b, i) => /* @__PURE__ */ jsxs("div", {
											className: "border-b border-slate-100 last:border-0 pb-3 last:pb-0",
											children: [
												/* @__PURE__ */ jsx("div", {
													className: "font-semibold text-slate-800 mb-1 flex items-center gap-2",
													children: /* @__PURE__ */ jsx("span", {
														className: "bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-xs",
														children: b.phase
													})
												}),
												/* @__PURE__ */ jsx("p", {
													className: "mb-2 text-slate-700",
													children: b.audio_spoken
												}),
												/* @__PURE__ */ jsxs("p", {
													className: "text-xs text-slate-500 italic bg-slate-50 p-2 rounded border border-slate-100",
													children: ["🎥 ภาพ: ", b.visual_direction]
												})
											]
										}, i))
									});
									else return /* @__PURE__ */ jsx("div", {
										className: "text-center py-10 text-slate-400",
										children: "ไม่มีข้อมูลสคริปต์"
									});
								})()
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "p-4 bg-white border-t border-slate-100 flex justify-end space-x-3 z-10",
								children: [/* @__PURE__ */ jsxs("button", {
									onClick: () => {
										try {
											const parsed = typeof selectedScript.content === "string" ? JSON.parse(selectedScript.content) : selectedScript.content;
											const exportName = selectedScript.totalVersions > 1 ? `${selectedScript.product_name}_v${selectedScript.versionIndex}` : selectedScript.product_name;
											exportToText(parsed, exportName);
										} catch {
											alert("ไม่สามารถอ่านข้อมูลสคริปต์ได้");
										}
									},
									className: "flex-1 sm:flex-none justify-center text-sm px-4 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg font-medium transition-colors flex items-center gap-2",
									children: [/* @__PURE__ */ jsx("svg", {
										className: "w-4 h-4",
										fill: "none",
										stroke: "currentColor",
										viewBox: "0 0 24 24",
										children: /* @__PURE__ */ jsx("path", {
											strokeLinecap: "round",
											strokeLinejoin: "round",
											strokeWidth: "2",
											d: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
										})
									}), " โหลด TXT"]
								}), /* @__PURE__ */ jsxs("button", {
									onClick: () => {
										try {
											const parsed = typeof selectedScript.content === "string" ? JSON.parse(selectedScript.content) : selectedScript.content;
											copyToClipboard(parsed);
										} catch {
											alert("ไม่สามารถอ่านข้อมูลสคริปต์ได้");
										}
									},
									className: "flex-1 sm:flex-none justify-center text-sm px-4 py-2.5 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm shadow-blue-200",
									children: [/* @__PURE__ */ jsx("svg", {
										className: "w-4 h-4",
										fill: "none",
										stroke: "currentColor",
										viewBox: "0 0 24 24",
										children: /* @__PURE__ */ jsx("path", {
											strokeLinecap: "round",
											strokeLinejoin: "round",
											strokeWidth: "2",
											d: "M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
										})
									}), " คัดลอก"]
								})]
							})
						]
					})
				});
			})()
		]
	});
}
var history_default = UNSAFE_withComponentProps(History);
//#endregion
//#region app/routes/pricing.jsx
var pricing_exports = /* @__PURE__ */ __exportAll({ default: () => pricing_default });
function Pricing() {
	const { user, profile } = useAuth();
	const navigate = useNavigate();
	const [isRedirecting, setIsRedirecting] = useState(false);
	const PLUS_LINK = "https://buy.stripe.com/9B6fZi0454Tg7ZSf5Nbwk00";
	const PRO_LINK = "https://buy.stripe.com/3cIbJ2045adAgwoe1Jbwk01";
	const handleCheckout = (baseLink) => {
		if (isRedirecting) return;
		setIsRedirecting(true);
		if (!user) {
			alert("กรุณาเข้าสู่ระบบก่อนชำระเงินครับ!");
			setIsRedirecting(false);
			navigate("/login");
			return;
		}
		const checkoutUrl = `${baseLink}?client_reference_id=${user.id}`;
		window.location.href = checkoutUrl;
	};
	const renderButton = (tierName, link, defaultClasses, normalText) => {
		const isFree = tierName === "free";
		if (!user) {
			if (isFree) return /* @__PURE__ */ jsx("button", {
				onClick: () => navigate("/register"),
				className: "mt-8 block w-full bg-slate-100 text-slate-900 hover:bg-slate-200 py-3 px-4 rounded-xl font-bold text-center transition-colors",
				children: "สมัครสมาชิกฟรี"
			});
			return /* @__PURE__ */ jsx("button", {
				onClick: () => handleCheckout(link),
				disabled: isRedirecting,
				className: defaultClasses,
				children: normalText
			});
		}
		const currentTier = profile?.tier || "free";
		const credits = profile?.credits || 0;
		if (currentTier === tierName) {
			if (isFree || credits > 0) return /* @__PURE__ */ jsxs("button", {
				disabled: true,
				className: "mt-8 block w-full bg-slate-100 text-slate-500 py-3 px-2 sm:px-4 rounded-xl font-bold text-center cursor-not-allowed border border-slate-300 whitespace-nowrap text-sm sm:text-base",
				children: [
					"กำลังใช้งาน (",
					credits,
					" เครดิต)"
				]
			});
			else return /* @__PURE__ */ jsx("button", {
				onClick: () => handleCheckout(link),
				disabled: isRedirecting,
				className: defaultClasses,
				children: "เติมโควต้าแพ็กเกจนี้"
			});
		}
		if (isFree) return /* @__PURE__ */ jsx("button", {
			disabled: true,
			className: "mt-8 block w-full bg-slate-100 text-slate-400 py-3 px-4 rounded-xl font-bold text-center cursor-not-allowed",
			children: "แพ็กเกจเริ่มต้น"
		});
		if (currentTier === "pro" && tierName === "plus") return /* @__PURE__ */ jsx("button", {
			disabled: true,
			className: "mt-8 block w-full bg-slate-100 text-slate-400 py-3 px-4 rounded-xl font-bold text-center cursor-not-allowed border border-slate-200",
			children: "คุณอยู่ในระดับ Pro แล้ว"
		});
		return /* @__PURE__ */ jsx("button", {
			onClick: () => handleCheckout(link),
			disabled: isRedirecting,
			className: defaultClasses,
			children: normalText
		});
	};
	return /* @__PURE__ */ jsxs(Fragment, { children: [
		/* @__PURE__ */ jsx("title", { children: "แพ็กเกจราคา | Auto Script" }),
		/* @__PURE__ */ jsx("meta", {
			name: "description",
			content: "เลือกแพ็กเกจ Auto Script ที่เหมาะกับคุณ จ่ายครั้งเดียวรับโควต้าเต็มๆ คุ้มค่าที่สุดสำหรับการทำคลิปขายของ"
		}),
		/* @__PURE__ */ jsxs("div", {
			className: "max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8",
			children: [
				/* @__PURE__ */ jsxs("button", {
					onClick: () => window.history.back(),
					className: "flex items-center text-slate-500 hover:text-blue-600 font-medium mb-6 transition-colors mx-auto sm:mx-0",
					children: [/* @__PURE__ */ jsx("svg", {
						className: "w-5 h-5 mr-1",
						fill: "none",
						stroke: "currentColor",
						viewBox: "0 0 24 24",
						children: /* @__PURE__ */ jsx("path", {
							strokeLinecap: "round",
							strokeLinejoin: "round",
							strokeWidth: "2",
							d: "M10 19l-7-7m0 0l7-7m-7 7h18"
						})
					}), "ย้อนกลับ"]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "text-center",
					children: [/* @__PURE__ */ jsx("h2", {
						className: "text-3xl font-extrabold text-slate-900 sm:text-4xl",
						children: "เลือกแพ็กเกจที่เหมาะกับยอดขายของคุณ"
					}), /* @__PURE__ */ jsxs("div", {
						className: "mt-4 flex flex-col items-center gap-3",
						children: [/* @__PURE__ */ jsx("p", {
							className: "text-xl text-slate-500",
							children: "จ่ายครั้งเดียวรับโควต้าเต็มๆ"
						}), /* @__PURE__ */ jsxs("div", {
							className: "inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-base font-semibold shadow-sm",
							children: [/* @__PURE__ */ jsxs("svg", {
								xmlns: "http://www.w3.org/2000/svg",
								fill: "none",
								viewBox: "0 0 24 24",
								strokeWidth: 1.5,
								stroke: "currentColor",
								className: "w-5 h-5",
								children: [/* @__PURE__ */ jsx("path", {
									strokeLinecap: "round",
									strokeLinejoin: "round",
									d: "M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z"
								}), /* @__PURE__ */ jsx("path", {
									strokeLinecap: "round",
									strokeLinejoin: "round",
									d: "M6.75 6.75h.75v.75h-.75v-.75ZM6.75 16.5h.75v.75h-.75v-.75ZM16.5 6.75h.75v.75h-.75v-.75ZM13.5 13.5h.75v.75h-.75v-.75ZM13.5 19.5h.75v.75h-.75v-.75ZM19.5 13.5h.75v.75h-.75v-.75ZM19.5 19.5h.75v.75h-.75v-.75ZM16.5 16.5h.75v.75h-.75v-.75Z"
								})]
							}), "รองรับสแกน QR Code"]
						})]
					})]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3",
					children: [
						/* @__PURE__ */ jsxs("div", {
							className: "bg-white border border-slate-200 rounded-2xl shadow-sm p-8 flex flex-col",
							children: [
								/* @__PURE__ */ jsx("h3", {
									className: "text-2xl font-semibold text-slate-900",
									children: "Free"
								}),
								/* @__PURE__ */ jsx("p", {
									className: "mt-4 text-slate-500 flex-1",
									children: "สายฟรีทดลองใช้งาน เหมาะสำหรับเริ่มต้น"
								}),
								/* @__PURE__ */ jsx("p", {
									className: "mt-8",
									children: /* @__PURE__ */ jsx("span", {
										className: "text-4xl font-extrabold text-slate-900",
										children: "฿0"
									})
								}),
								/* @__PURE__ */ jsxs("ul", {
									className: "mt-6 space-y-4 flex-1",
									children: [
										/* @__PURE__ */ jsxs("li", {
											className: "flex items-start",
											children: [/* @__PURE__ */ jsx("span", {
												className: "text-green-500 mr-3",
												children: "✓"
											}), /* @__PURE__ */ jsx("span", {
												className: "text-slate-700",
												children: "3 สคริปต์ (ฟรีเริ่มต้น)"
											})]
										}),
										/* @__PURE__ */ jsxs("li", {
											className: "flex items-start",
											children: [/* @__PURE__ */ jsx("span", {
												className: "text-green-500 mr-3",
												children: "✓"
											}), /* @__PURE__ */ jsx("span", {
												className: "text-slate-700",
												children: "ใช้งานได้เฉพาะโหมด \"ป้ายยาตรงๆ\""
											})]
										}),
										/* @__PURE__ */ jsxs("li", {
											className: "flex items-start",
											children: [/* @__PURE__ */ jsx("span", {
												className: "text-slate-300 mr-3",
												children: "✗"
											}), /* @__PURE__ */ jsx("span", {
												className: "text-slate-400 line-through",
												children: "ระบุกลุ่มเป้าหมาย"
											})]
										}),
										/* @__PURE__ */ jsxs("li", {
											className: "flex items-start",
											children: [/* @__PURE__ */ jsx("span", {
												className: "text-slate-300 mr-3",
												children: "✗"
											}), /* @__PURE__ */ jsx("span", {
												className: "text-slate-400 line-through",
												children: "สร้างทีเดียว 3 สไตล์ (Multi-Version)"
											})]
										})
									]
								}),
								renderButton("free", null, "", "")
							]
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "bg-blue-50 border-2 border-blue-500 rounded-2xl shadow-md p-8 flex flex-col relative transform lg:-translate-y-4",
							children: [
								/* @__PURE__ */ jsx("div", {
									className: "absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2",
									children: /* @__PURE__ */ jsx("span", {
										className: "bg-blue-600 text-white text-sm font-bold uppercase tracking-wider py-1 px-3 rounded-full",
										children: "ยอดนิยม"
									})
								}),
								/* @__PURE__ */ jsx("h3", {
									className: "text-2xl font-semibold text-slate-900",
									children: "Plus"
								}),
								/* @__PURE__ */ jsx("p", {
									className: "mt-4 text-slate-500 flex-1",
									children: "สำหรับพ่อค้าแม่ค้าพาร์ทไทม์ ปลดล็อกฟีเจอร์คุ้มค่า"
								}),
								/* @__PURE__ */ jsxs("div", {
									className: "mt-8 flex flex-col",
									children: [/* @__PURE__ */ jsxs("div", {
										className: "flex items-end gap-2",
										children: [/* @__PURE__ */ jsx("span", {
											className: "text-xl font-bold text-slate-400 line-through decoration-red-500/50",
											children: "฿490"
										}), /* @__PURE__ */ jsx("span", {
											className: "text-4xl font-extrabold text-slate-900",
											children: "฿249"
										})]
									}), /* @__PURE__ */ jsx("span", {
										className: "text-sm font-medium text-blue-600 mt-2 bg-blue-50 w-fit px-2 py-1 rounded",
										children: "เฉลี่ยเพียง 4.1 บาท/สคริปต์"
									})]
								}),
								/* @__PURE__ */ jsxs("ul", {
									className: "mt-6 space-y-4 flex-1",
									children: [
										/* @__PURE__ */ jsxs("li", {
											className: "flex items-start",
											children: [/* @__PURE__ */ jsx("span", {
												className: "text-blue-500 mr-3",
												children: "✓"
											}), /* @__PURE__ */ jsx("span", {
												className: "text-slate-900 font-medium",
												children: "ได้โควต้า 60 สคริปต์"
											})]
										}),
										/* @__PURE__ */ jsxs("li", {
											className: "flex items-start",
											children: [/* @__PURE__ */ jsx("span", {
												className: "text-blue-500 mr-3",
												children: "✓"
											}), /* @__PURE__ */ jsx("span", {
												className: "text-slate-700",
												children: "ปลดล็อกครบ 5 โหมดจิตวิทยา"
											})]
										}),
										/* @__PURE__ */ jsxs("li", {
											className: "flex items-start",
											children: [/* @__PURE__ */ jsx("span", {
												className: "text-blue-500 mr-3",
												children: "✓"
											}), /* @__PURE__ */ jsx("span", {
												className: "text-slate-900 font-semibold",
												children: "ระบุกลุ่มเป้าหมาย (เพศ/อายุ)"
											})]
										}),
										/* @__PURE__ */ jsxs("li", {
											className: "flex items-start",
											children: [/* @__PURE__ */ jsx("span", {
												className: "text-slate-300 mr-3",
												children: "✗"
											}), /* @__PURE__ */ jsx("span", {
												className: "text-slate-400 line-through",
												children: "สร้างทีเดียว 3 สไตล์ (Multi-Version)"
											})]
										})
									]
								}),
								renderButton("plus", PLUS_LINK, "mt-8 block w-full bg-blue-600 text-white hover:bg-blue-700 py-3 px-4 rounded-xl font-bold text-center transition-all shadow-lg hover:shadow-blue-500/30", "อัปเกรดเป็น Plus")
							]
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "bg-slate-900 border border-slate-700 rounded-2xl shadow-xl p-8 flex flex-col relative",
							children: [
								/* @__PURE__ */ jsx("div", {
									className: "absolute top-0 right-4 transform -translate-y-1/2",
									children: /* @__PURE__ */ jsx("span", {
										className: "bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold uppercase tracking-wider py-1 px-2 rounded",
										children: "ฟีเจอร์ครบสุด"
									})
								}),
								/* @__PURE__ */ jsx("h3", {
									className: "text-2xl font-semibold text-white",
									children: "Pro"
								}),
								/* @__PURE__ */ jsx("p", {
									className: "mt-4 text-slate-400 flex-1",
									children: "สายเอเจนซี่ อินฟลูเอนเซอร์มืออาชีพ จัดเต็มทุกฟีเจอร์"
								}),
								/* @__PURE__ */ jsxs("div", {
									className: "mt-8 flex flex-col",
									children: [/* @__PURE__ */ jsxs("div", {
										className: "flex items-end gap-2",
										children: [/* @__PURE__ */ jsx("span", {
											className: "text-xl font-bold text-slate-500 line-through decoration-red-500/80",
											children: "฿990"
										}), /* @__PURE__ */ jsx("span", {
											className: "text-4xl font-extrabold text-white",
											children: "฿590"
										})]
									}), /* @__PURE__ */ jsx("span", {
										className: "text-sm font-medium text-amber-400 mt-2 bg-amber-400/10 w-fit px-2 py-1 rounded border border-amber-400/20",
										children: "เฉลี่ยเพียง 3.9 บาท/สคริปต์ (คุ้มสุด)"
									})]
								}),
								/* @__PURE__ */ jsxs("ul", {
									className: "mt-6 space-y-4 flex-1",
									children: [
										/* @__PURE__ */ jsxs("li", {
											className: "flex items-start",
											children: [/* @__PURE__ */ jsx("span", {
												className: "text-amber-400 mr-3",
												children: "✓"
											}), /* @__PURE__ */ jsx("span", {
												className: "text-white font-medium",
												children: "ได้โควต้า 150 สคริปต์"
											})]
										}),
										/* @__PURE__ */ jsxs("li", {
											className: "flex items-start",
											children: [/* @__PURE__ */ jsx("span", {
												className: "text-amber-400 mr-3",
												children: "✓"
											}), /* @__PURE__ */ jsx("span", {
												className: "text-slate-300",
												children: "ปลดล็อกครบ 5 โหมดจิตวิทยา"
											})]
										}),
										/* @__PURE__ */ jsxs("li", {
											className: "flex items-start",
											children: [/* @__PURE__ */ jsx("span", {
												className: "text-amber-400 mr-3",
												children: "✓"
											}), /* @__PURE__ */ jsx("span", {
												className: "text-slate-300",
												children: "ระบุกลุ่มเป้าหมาย (เพศ/อายุ)"
											})]
										}),
										/* @__PURE__ */ jsxs("li", {
											className: "flex items-center",
											children: [/* @__PURE__ */ jsx("span", {
												className: "text-amber-400 mr-3 shrink-0",
												children: /* @__PURE__ */ jsx("svg", {
													xmlns: "http://www.w3.org/2000/svg",
													viewBox: "0 0 24 24",
													fill: "currentColor",
													className: "w-5 h-5",
													children: /* @__PURE__ */ jsx("path", {
														fillRule: "evenodd",
														d: "M9 4.5a.75.75 0 0 1 .721.544l.813 2.846a3.75 3.75 0 0 0 2.576 2.576l2.846.813a.75.75 0 0 1 0 1.442l-2.846.813a3.75 3.75 0 0 0-2.576 2.576l-.813 2.846a.75.75 0 0 1-1.442 0l-.813-2.846a3.75 3.75 0 0 0-2.576-2.576l-2.846-.813a.75.75 0 0 1 0-1.442l2.846-.813A3.75 3.75 0 0 0 7.466 7.89l.813-2.846A.75.75 0 0 1 9 4.5ZM18 1.5a.75.75 0 0 1 .728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 0 1 0 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 0 1-1.456 0l-.258-1.036a2.625 2.625 0 0 0-1.91-1.91l-1.036-.258a.75.75 0 0 1 0-1.456l1.036-.258a2.625 2.625 0 0 0 1.91-1.91l.258-1.036A.75.75 0 0 1 18 1.5ZM16.5 15a.75.75 0 0 1 .712.513l.394 1.183c.15.447.5.799.948.948l1.183.395a.75.75 0 0 1 0 1.422l-1.183.395c-.447.15-.799.5-.948.948l-.395 1.183a.75.75 0 0 1-1.422 0l-.395-1.183a1.5 1.5 0 0 0-.948-.948l-1.183-.395a.75.75 0 0 1 0-1.422l1.183-.395c.447-.15.799-.5.948-.948l.395-1.183A.75.75 0 0 1 16.5 15Z",
														clipRule: "evenodd"
													})
												})
											}), /* @__PURE__ */ jsx("span", {
												className: "text-white font-bold bg-slate-800 px-2 py-0.5 rounded whitespace-nowrap text-sm sm:text-base",
												children: "สร้างทีเดียว 3 สไตล์ (Multi-Version)"
											})]
										}),
										/* @__PURE__ */ jsxs("li", {
											className: "flex items-start",
											children: [/* @__PURE__ */ jsx("span", {
												className: "text-amber-400 mr-3 shrink-0 mt-0.5",
												children: /* @__PURE__ */ jsx("svg", {
													className: "w-5 h-5",
													fill: "none",
													stroke: "currentColor",
													viewBox: "0 0 24 24",
													children: /* @__PURE__ */ jsx("path", {
														strokeLinecap: "round",
														strokeLinejoin: "round",
														strokeWidth: "2",
														d: "M13 10V3L4 14h7v7l9-11h-7z"
													})
												})
											}), /* @__PURE__ */ jsxs("div", {
												className: "flex flex-col",
												children: [/* @__PURE__ */ jsx("span", {
													className: "text-white font-bold bg-slate-800 px-2 py-0.5 rounded w-fit text-sm sm:text-base",
													children: "โหมด Belief-Shifting"
												}), /* @__PURE__ */ jsx("span", {
													className: "text-slate-400 text-sm mt-1.5 leading-relaxed",
													children: "วิเคราะห์ความเชื่อผิดๆ ของลูกค้า (False Belief) และหักล้างด้วยจุดแข็งของสินค้าอย่างมีชั้นเชิง (Epiphany Bridge)"
												})]
											})]
										})
									]
								}),
								renderButton("pro", PRO_LINK, "mt-8 block w-full bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 hover:from-amber-500 hover:to-orange-600 py-3 px-4 rounded-xl font-extrabold text-center transition-all shadow-lg hover:shadow-orange-500/20", "อัปเกรดเป็น Pro")
							]
						})
					]
				})
			]
		})
	] });
}
var pricing_default = UNSAFE_withComponentProps(Pricing);
//#endregion
//#region app/lib/bannedWords.js
var bannedWords = [
	{
		word: "ขาวถาวร",
		reason: "อ้างสรรพคุณเกินจริง (Overclaim) เสี่ยงโดนปิดกั้นการมองเห็น"
	},
	{
		word: "ลดน้ำหนัก",
		reason: "เป็นคำอ่อนไหวในหมวดสุขภาพ แนะนำให้ใช้คำว่า 'ดูแลรูปร่าง' หรือ 'คุมน้ำหนัก' แทน"
	},
	{
		word: "เห็นผล 100%",
		reason: "เป็นการการันตีผลลัพธ์เกินจริง ผิดกฎโฆษณา"
	},
	{
		word: "ฆ่าเชื้อ",
		reason: "อาจเข้าข่ายผลิตภัณฑ์ทางการแพทย์ ต้องมีใบอนุญาต"
	},
	{
		word: "ดีที่สุดในโลก",
		reason: "ข้อความโฆษณาโอ้อวดเกินจริง ไม่สามารถพิสูจน์ได้"
	},
	{
		word: "รักษา",
		reason: "ห้ามใช้กับเครื่องสำอางหรืออาหารเสริม เพราะถือว่าอ้างสรรพคุณทางยา"
	}
];
function scanForBannedWords(text) {
	if (!text) return [];
	const foundWarnings = [];
	bannedWords.forEach((banned) => {
		if (text.includes(banned.word)) foundWarnings.push(banned);
	});
	return foundWarnings;
}
function escapeHtml(unsafe) {
	if (!unsafe) return "";
	return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function highlightBannedWords(text, foundWarnings) {
	if (!text) return text;
	let safeText = escapeHtml(text);
	if (!foundWarnings || foundWarnings.length === 0) return safeText;
	let highlightedText = safeText;
	foundWarnings.forEach((warning) => {
		const safeWord = escapeHtml(warning.word);
		const replacement = `<span class="bg-red-500 text-white px-1 rounded mx-0.5 cursor-help" title="${escapeHtml(warning.reason)}">${safeWord}</span>`;
		highlightedText = highlightedText.split(safeWord).join(replacement);
	});
	return highlightedText;
}
//#endregion
//#region app/lib/profanityWords.js
var profanityWords = [
	"ควย",
	"ค.ย",
	"ค_ย",
	"หี",
	"ฮี",
	"แตด",
	"หำ",
	"จิ๋ม",
	"จู๋",
	"เจี๊ยว",
	"ไข่ดัน",
	"เย็ด",
	"เด้า",
	"เอาแม่",
	"เงี่ยน",
	"อมควย",
	"เลียหี",
	"เหี้ย",
	"เชี่ย",
	"สัส",
	"ไอ้สัส",
	"อีสัส",
	"สัตว์",
	"ควาย",
	"ไอ้ควาย",
	"อีควาย",
	"หมา",
	"หน้าหมา",
	"ลูกหมา",
	"กะหรี่",
	"กะรี่",
	"ดอกทอง",
	"แรด",
	"หน้าตัวเมีย",
	"หน้าหี",
	"หน้าส้นตีน",
	"ส้นตีน",
	"แม่ง",
	"ชิบหาย",
	"ฉิบหาย",
	"ระยำ",
	"จัญไร",
	"เปรต",
	"เสือก",
	"พ่อง",
	"พ่อมึง",
	"แม่มึง",
	"พ่อตาย",
	"แม่ตาย",
	"เย็ดแม่",
	"fuck",
	"shit",
	"bitch",
	"bastard",
	"asshole",
	"dick",
	"pussy",
	"cunt",
	"whore",
	"slut",
	"motherfucker"
];
function escapeRegExp(string) {
	return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function containsProfanity(text) {
	if (!text) return false;
	const lowerText = text.toLowerCase();
	for (let word of profanityWords) if (/^[a-zA-Z]+$/.test(word)) {
		if (new RegExp(`\\b${escapeRegExp(word)}\\b`, "i").test(lowerText)) return true;
	} else if (lowerText.includes(word)) {
		const safeWords = [
			"หีบ",
			"มหาวิทยาลัย",
			"หมาด",
			"สมาน",
			"อหังการ"
		];
		let cleanedText = lowerText;
		for (let safe of safeWords) cleanedText = cleanedText.split(safe).join("");
		if (cleanedText.includes(word)) return true;
	}
	return false;
}
//#endregion
//#region app/routes/create.jsx
var create_exports = /* @__PURE__ */ __exportAll({ default: () => create_default });
function CreateScript() {
	const { user, profile, setProfile, loading } = useAuth();
	const analyzeAbortRef = useRef(null);
	const errorRef = useRef(null);
	const [productName, setProductName] = useState("");
	const [productDetails, setProductDetails] = useState("");
	const [pricePromo, setPricePromo] = useState("");
	const [videoLength, setVideoLength] = useState("สั้น");
	const [speakerTone, setSpeakerTone] = useState("ผู้หญิง");
	const [mode, setMode] = useState("ขยี้ปัญหา (PAS Formula)");
	const [competitor, setCompetitor] = useState("");
	const [targetAudience, setTargetAudience] = useState("");
	const [productUrls, setProductUrls] = useState([""]);
	const [falseBelief, setFalseBelief] = useState("");
	const [mechanism, setMechanism] = useState("");
	const [isAnalyzing, setIsAnalyzing] = useState(false);
	const [terminalText, setTerminalText] = useState("");
	const [showTerminal, setShowTerminal] = useState(false);
	const [generatedScript, setGeneratedScript] = useState(null);
	const [isGenerating, setIsGenerating] = useState(false);
	const [generatingMode, setGeneratingMode] = useState(null);
	const [bannedWarnings, setBannedWarnings] = useState([]);
	const [error, setError] = useState(null);
	const [activeTab, setActiveTab] = useState("funny");
	const navigate = useNavigate();
	const modes = [
		{
			id: "ขยี้ปัญหา (PAS Formula)",
			name: "ขยี้ปัญหา (สูตร PAS)",
			description: "เริ่มด้วยปัญหา จี้จุดเจ็บ แล้วจบด้วยสินค้า",
			icon: /* @__PURE__ */ jsx("div", {
				className: "p-1.5 bg-rose-50 rounded-md text-rose-500 shadow-sm border border-rose-100",
				children: /* @__PURE__ */ jsx("svg", {
					className: "w-4 h-4",
					fill: "none",
					stroke: "currentColor",
					viewBox: "0 0 24 24",
					children: /* @__PURE__ */ jsx("path", {
						strokeLinecap: "round",
						strokeLinejoin: "round",
						strokeWidth: "2",
						d: "M13 10V3L4 14h7v7l9-11h-7z"
					})
				})
			})
		},
		{
			id: "นักเล่าเรื่อง (Hook-Story-Offer)",
			name: "นักเล่าเรื่อง (สูตร HSO)",
			description: "เล่าประสบการณ์จริง สร้างความอิน เนียนป้ายยา",
			icon: /* @__PURE__ */ jsx("div", {
				className: "p-1.5 bg-indigo-50 rounded-md text-indigo-500 shadow-sm border border-indigo-100",
				children: /* @__PURE__ */ jsx("svg", {
					className: "w-4 h-4",
					fill: "none",
					stroke: "currentColor",
					viewBox: "0 0 24 24",
					children: /* @__PURE__ */ jsx("path", {
						strokeLinecap: "round",
						strokeLinejoin: "round",
						strokeWidth: "2",
						d: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
					})
				})
			})
		},
		{
			id: "โชว์การเปลี่ยนแปลง (BAB Formula)",
			name: "โชว์การเปลี่ยนแปลง (สูตร BAB)",
			description: "เทียบอดีตที่ลำบาก กับปัจจุบันที่ชีวิตดีขึ้น",
			icon: /* @__PURE__ */ jsx("div", {
				className: "p-1.5 bg-amber-50 rounded-md text-amber-500 shadow-sm border border-amber-100",
				children: /* @__PURE__ */ jsx("svg", {
					className: "w-4 h-4",
					fill: "none",
					stroke: "currentColor",
					viewBox: "0 0 24 24",
					children: /* @__PURE__ */ jsx("path", {
						strokeLinecap: "round",
						strokeLinejoin: "round",
						strokeWidth: "2",
						d: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
					})
				})
			})
		},
		{
			id: "สายสเปค/ฟังก์ชัน (FAB Formula)",
			name: "สายฟังก์ชัน (สูตร FAB)",
			description: "เปลี่ยนสเปคจุกจิก ให้เป็นประโยชน์ที่อยากได้",
			icon: /* @__PURE__ */ jsx("div", {
				className: "p-1.5 bg-emerald-50 rounded-md text-emerald-500 shadow-sm border border-emerald-100",
				children: /* @__PURE__ */ jsx("svg", {
					className: "w-4 h-4",
					fill: "none",
					stroke: "currentColor",
					viewBox: "0 0 24 24",
					children: /* @__PURE__ */ jsx("path", {
						strokeLinecap: "round",
						strokeLinejoin: "round",
						strokeWidth: "2",
						d: "M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
					})
				})
			})
		},
		{
			id: "เปรียบเทียบชัดๆ",
			name: "เปรียบเทียบชัดๆ",
			description: "โจมตีข้อเสียของแบรนด์ทั่วไป ชูจุดเด่นเรา",
			icon: /* @__PURE__ */ jsx("div", {
				className: "p-1.5 bg-cyan-50 rounded-md text-cyan-600 shadow-sm border border-cyan-100",
				children: /* @__PURE__ */ jsx("svg", {
					className: "w-4 h-4",
					fill: "none",
					stroke: "currentColor",
					viewBox: "0 0 24 24",
					children: /* @__PURE__ */ jsx("path", {
						strokeLinecap: "round",
						strokeLinejoin: "round",
						strokeWidth: "2",
						d: "M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
					})
				})
			})
		},
		{
			id: "โครงสร้างเจาะลึก",
			name: "โครงสร้างเจาะลึก",
			description: "เจาะลึก เปลี่ยนความเชื่อผิดๆ ด้วยหลักจิตวิทยา",
			isProOnly: true,
			icon: /* @__PURE__ */ jsx("div", {
				className: "p-1.5 bg-purple-50 rounded-md text-purple-600 shadow-sm border border-purple-100",
				children: /* @__PURE__ */ jsx("svg", {
					className: "w-4 h-4",
					fill: "none",
					stroke: "currentColor",
					viewBox: "0 0 24 24",
					children: /* @__PURE__ */ jsx("path", {
						strokeLinecap: "round",
						strokeLinejoin: "round",
						strokeWidth: "2",
						d: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
					})
				})
			})
		}
	];
	const lengths = [
		{
			id: "สั้น",
			time: "10-15 วิ",
			desc: "(สั้น/กระชับ)"
		},
		{
			id: "กลาง",
			time: "30-45 วิ",
			desc: "(ปานกลาง)"
		},
		{
			id: "ยาว",
			time: "60 วิ+",
			desc: "(ละเอียด)"
		}
	];
	const tones = [{
		id: "ผู้หญิง",
		label: "ผู้หญิง",
		desc: "(ค่ะ, คะ, ฉัน)",
		icon: /* @__PURE__ */ jsx("svg", {
			className: "w-5 h-5 mb-1",
			fill: "none",
			stroke: "currentColor",
			viewBox: "0 0 24 24",
			children: /* @__PURE__ */ jsx("path", {
				strokeLinecap: "round",
				strokeLinejoin: "round",
				strokeWidth: "2",
				d: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
			})
		})
	}, {
		id: "ผู้ชาย",
		label: "ผู้ชาย",
		desc: "(ครับ, ผม)",
		icon: /* @__PURE__ */ jsx("svg", {
			className: "w-5 h-5 mb-1",
			fill: "none",
			stroke: "currentColor",
			viewBox: "0 0 24 24",
			children: /* @__PURE__ */ jsx("path", {
				strokeLinecap: "round",
				strokeLinejoin: "round",
				strokeWidth: "2",
				d: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
			})
		})
	}];
	useEffect(() => {
		if (!loading && !user) navigate("/login");
	}, [
		user,
		loading,
		navigate
	]);
	useEffect(() => {
		return () => {
			if (analyzeAbortRef.current) analyzeAbortRef.current.abort();
		};
	}, []);
	const effectiveTier = profile ? profile.tier === "free" && profile.trial_pro_remaining > 0 ? "pro" : profile.tier : "free";
	const scrollToError = () => {
		setTimeout(() => {
			if (errorRef.current) {
				const y = errorRef.current.getBoundingClientRect().top + window.scrollY - 100;
				window.scrollTo({
					top: y,
					behavior: "smooth"
				});
			} else window.scrollTo({
				top: 0,
				behavior: "smooth"
			});
		}, 50);
	};
	const handleGenerate = async (e, isMultiVersion = false) => {
		if (e) e.preventDefault();
		if (!productName.trim()) {
			setError("กรุณากรอก \"ชื่อสินค้า\" ก่อนสร้างสคริปต์ครับ");
			scrollToError();
			return;
		}
		if (!productDetails.trim()) {
			setError("กรุณากรอก \"รายละเอียดสินค้า\" เพื่อให้ AI เขียนสคริปต์ได้ตรงใจครับ");
			scrollToError();
			return;
		}
		if (mode === "โครงสร้างเจาะลึก") {
			if (!falseBelief.trim() || !mechanism.trim()) {
				setError("โหมดโครงสร้างเจาะลึก: กรุณากรอก \"ความเชื่อผิดๆ\" และ \"กลไก/ความลับ\" ให้ครบถ้วนครับ");
				scrollToError();
				return;
			}
		}
		if (containsProfanity(`${productName} ${productDetails} ${competitor} ${targetAudience}`)) {
			setError("ไม่อนุญาตให้ใช้คำหยาบคาย! เว็บ Auto Script ห้ามใช้คำหยาบเด็ดขาด กรุณาแก้ไขข้อมูลของคุณ");
			scrollToError();
			return;
		}
		if (!user) {
			alert("Error: ไม่พบข้อมูล User (ยังไม่ได้ล็อกอิน)");
			return;
		}
		if (!profile) {
			alert("Error: ยังโหลดข้อมูลโควต้าไม่เสร็จ หรือโหลดไม่พบ");
			return;
		}
		const cost = isMultiVersion ? 2 : 1;
		if (profile.credits < cost) {
			alert(`โควต้าเครดิตของคุณไม่พอ (ต้องการ ${cost} เครดิต, มี ${profile.credits} เครดิต) กรุณาอัปเกรดแพ็กเกจ`);
			navigate("/pricing");
			return;
		}
		setIsGenerating(true);
		setGeneratingMode(isMultiVersion ? "multi" : "single");
		setError(null);
		setGeneratedScript(null);
		setBannedWarnings([]);
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 6e4);
		try {
			const { data: { session } } = await supabase.auth.getSession();
			if (!session?.access_token) {
				clearTimeout(timeoutId);
				throw new Error("กรุณาล็อกอินใหม่");
			}
			const payload = {
				productName,
				productDetails,
				pricePromo,
				videoLength,
				speakerTone,
				mode,
				competitor: mode === "เปรียบเทียบชัดๆ" ? competitor : "",
				falseBelief: mode === "โครงสร้างเจาะลึก" ? falseBelief : "",
				mechanism: mode === "โครงสร้างเจาะลึก" ? mechanism : "",
				targetAudience: effectiveTier !== "free" ? targetAudience : "",
				isMultiVersion
			};
			const response = await fetch("/api/generate", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Authorization": `Bearer ${session.access_token}`
				},
				body: JSON.stringify(payload),
				signal: controller.signal
			});
			clearTimeout(timeoutId);
			const responseData = await response.json();
			if (!response.ok) throw new Error(responseData.error || "Failed to generate script");
			let finalScriptData = responseData.script;
			const newCredits = responseData.credits_remaining;
			let allText = "";
			if (finalScriptData.raw_multi_version) {
				const raw = finalScriptData.raw_multi_version;
				const funnyMatch = raw.match(/<VERSION_FUNNY>([\s\S]*?)<\/VERSION_FUNNY>/);
				const reviewMatch = raw.match(/<VERSION_REVIEW>([\s\S]*?)<\/VERSION_REVIEW>/);
				const fomoMatch = raw.match(/<VERSION_FOMO>([\s\S]*?)<\/VERSION_FOMO>/);
				const safeParse = (str) => {
					try {
						return JSON.parse(str.replace(/```json/g, "").replace(/```/g, "").trim());
					} catch (e) {
						return null;
					}
				};
				finalScriptData = {
					isMulti: true,
					funny: funnyMatch ? safeParse(funnyMatch[1]) : null,
					review: reviewMatch ? safeParse(reviewMatch[1]) : null,
					fomo: fomoMatch ? safeParse(fomoMatch[1]) : null
				};
				const getBlocks = (scriptObj) => scriptObj?.script_blocks?.map((b) => b.audio_spoken).join(" ") || "";
				allText = getBlocks(finalScriptData.funny) + " " + getBlocks(finalScriptData.review) + " " + getBlocks(finalScriptData.fomo);
			} else allText = finalScriptData.script_blocks?.map((b) => b.audio_spoken).join(" ") || "";
			const warnings = scanForBannedWords(allText);
			const uniqueWarnings = Array.from(new Set(warnings.map((a) => a.word))).map((word) => warnings.find((a) => a.word === word));
			setBannedWarnings(uniqueWarnings);
			setGeneratedScript(finalScriptData);
			setProfile((prev) => prev ? {
				...prev,
				credits: newCredits,
				...responseData.trial_pro_remaining !== void 0 && { trial_pro_remaining: responseData.trial_pro_remaining }
			} : prev);
			window.dispatchEvent(new Event("profileUpdated"));
		} catch (err) {
			console.error(err);
			if (err.name === "AbortError") setError("การเชื่อมต่อใช้เวลานานเกินไป (60 วินาที) กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่ครับ");
			else setError(err.message || "เกิดข้อผิดพลาดในการสร้างสคริปต์ กรุณาลองใหม่อีกครั้งครับ");
			scrollToError();
		} finally {
			clearTimeout(timeoutId);
			setIsGenerating(false);
			setGeneratingMode(null);
		}
	};
	const copyToClipboard = () => {
		if (!generatedScript) return;
		const textToCopy = (generatedScript.isMulti ? generatedScript[activeTab]?.script_blocks : generatedScript.script_blocks)?.map((block) => block.audio_spoken)?.join("\n\n");
		if (textToCopy) {
			navigator.clipboard.writeText(textToCopy);
			alert("คัดลอกสคริปต์เรียบร้อยแล้ว!");
		}
	};
	return /* @__PURE__ */ jsxs("div", {
		className: "max-w-6xl mx-auto",
		children: [
			/* @__PURE__ */ jsx("div", {
				className: "mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4",
				children: /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsxs("div", {
					className: "flex flex-wrap items-center gap-2 mb-3 sm:flex-nowrap",
					children: [
						/* @__PURE__ */ jsx("h1", {
							className: "text-[1.35rem] sm:text-3xl font-bold text-slate-900 whitespace-nowrap overflow-hidden text-ellipsis",
							children: "สร้างสคริปต์รีวิวด้วย AI"
						}),
						profile && /* @__PURE__ */ jsx("div", {
							className: `flex items-center space-x-1.5 px-3 py-1 text-[10px] sm:text-xs font-bold uppercase tracking-wide rounded-full border shadow-sm whitespace-nowrap shrink-0 ${profile.tier === "pro" ? "bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200 text-amber-700" : profile.tier === "plus" ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-slate-50 border-slate-200 text-slate-600"}`,
							children: profile.tier === "pro" ? /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("svg", {
								className: "w-3.5 h-3.5 text-amber-500",
								fill: "currentColor",
								viewBox: "0 0 20 20",
								children: /* @__PURE__ */ jsx("path", { d: "M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" })
							}), /* @__PURE__ */ jsx("span", { children: "Pro Plan" })] }) : profile.tier === "plus" ? /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("svg", {
								className: "w-3.5 h-3.5 text-blue-500",
								fill: "none",
								stroke: "currentColor",
								viewBox: "0 0 24 24",
								children: /* @__PURE__ */ jsx("path", {
									strokeLinecap: "round",
									strokeLinejoin: "round",
									strokeWidth: "2",
									d: "M13 10V3L4 14h7v7l9-11h-7z"
								})
							}), /* @__PURE__ */ jsx("span", { children: "Plus Plan" })] }) : /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("div", { className: "w-2 h-2 rounded-full bg-slate-400" }), /* @__PURE__ */ jsx("span", { children: "Free Plan" })] })
						}),
						profile && profile.tier === "free" && profile.trial_pro_remaining > 0 && /* @__PURE__ */ jsx("div", {
							className: "flex items-center space-x-1.5 px-3 py-1 text-[10px] sm:text-xs font-bold tracking-wide rounded-full border shadow-sm whitespace-nowrap shrink-0 bg-gradient-to-r from-purple-50 to-fuchsia-50 border-purple-200 text-purple-700 animate-pulse",
							children: /* @__PURE__ */ jsxs("span", { children: [
								"🎁 ทดลองใช้ Pro ฟรี (เหลือ ",
								Math.min(profile.credits, profile.trial_pro_remaining),
								" ครั้ง)"
							] })
						})
					]
				}), /* @__PURE__ */ jsxs("div", {
					className: "inline-flex items-center bg-white border border-slate-200 text-slate-600 px-3.5 py-1.5 rounded-lg text-sm shadow-sm",
					children: [/* @__PURE__ */ jsx("span", {
						className: "mr-2",
						children: "โควต้าการสร้าง"
					}), /* @__PURE__ */ jsxs("span", {
						className: "flex items-center justify-center bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold px-2 py-0.5 rounded text-xs shadow-inner",
						children: [profile ? profile.credits : "...", " สคริปต์"]
					})]
				})] })
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "grid grid-cols-1 lg:grid-cols-2 gap-8",
				children: [/* @__PURE__ */ jsx("div", {
					className: "bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit",
					children: /* @__PURE__ */ jsxs("form", {
						onSubmit: handleGenerate,
						className: "space-y-6",
						children: [
							error && /* @__PURE__ */ jsx("div", {
								ref: errorRef,
								className: "bg-red-50 text-red-600 p-3 rounded-lg text-sm",
								children: error
							}),
							effectiveTier === "pro" && /* @__PURE__ */ jsxs("div", {
								className: "p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg mb-6",
								children: [/* @__PURE__ */ jsx("label", {
									className: "block text-sm font-bold text-amber-800 mb-2 flex items-center justify-between",
									children: /* @__PURE__ */ jsxs("div", {
										className: "flex items-center",
										children: [/* @__PURE__ */ jsx("span", {
											className: "mr-2",
											children: /* @__PURE__ */ jsxs("svg", {
												className: "w-4 h-4",
												fill: "none",
												stroke: "currentColor",
												viewBox: "0 0 24 24",
												children: [/* @__PURE__ */ jsx("path", {
													strokeLinecap: "round",
													strokeLinejoin: "round",
													strokeWidth: "2",
													d: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
													className: "hidden"
												}), /* @__PURE__ */ jsx("path", {
													strokeLinecap: "round",
													strokeLinejoin: "round",
													strokeWidth: "2",
													d: "M3 21h18M4 18l3-12 5 7 5-7 3 12H4z"
												})]
											})
										}), " ข้อมูลเบื้องต้น"]
									})
								}), /* @__PURE__ */ jsx("p", {
									className: "text-xs text-amber-700",
									children: "สามารถใส่รายละเอียดสินค้าในช่องด้านล่าง เพื่อให้ AI วิเคราะห์ข้อมูลเชิงลึกได้แม่นยำยิ่งขึ้น"
								})]
							}),
							/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
								className: "block text-sm font-medium text-slate-700 mb-2",
								children: "ชื่อสินค้า"
							}), /* @__PURE__ */ jsx("input", {
								type: "text",
								required: true,
								value: productName,
								onChange: (e) => setProductName(e.target.value),
								className: "w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none",
								placeholder: "เช่น เซรั่มหน้าใส แบรนด์ XYZ"
							})] }),
							/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
								className: "block text-sm font-medium text-slate-700 mb-2",
								children: "รายละเอียดสินค้า (จุดขายที่อยากให้เน้นเป็นพิเศษ)"
							}), /* @__PURE__ */ jsx("textarea", {
								required: true,
								rows: "3",
								value: productDetails,
								onChange: (e) => setProductDetails(e.target.value),
								className: "w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none",
								placeholder: "เช่น คุมมัน 12 ชั่วโมง, ซึมไวใน 3 วิ"
							})] }),
							/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
								className: "block text-sm font-medium text-slate-700 mb-2",
								children: "ราคา/โปรโมชั่น"
							}), /* @__PURE__ */ jsx("input", {
								type: "text",
								value: pricePromo,
								onChange: (e) => setPricePromo(e.target.value),
								className: "w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none",
								placeholder: "เช่น ลดเหลือ 99.- 1แถม1"
							})] }),
							/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
								className: "block text-sm font-medium text-slate-700 mb-3",
								children: "ความยาวคลิป (Video Length)"
							}), /* @__PURE__ */ jsx("div", {
								className: "grid grid-cols-3 gap-2 bg-slate-100 p-1.5 rounded-xl",
								children: lengths.map((l) => /* @__PURE__ */ jsxs("button", {
									type: "button",
									onClick: () => setVideoLength(l.id),
									className: `flex flex-col items-center justify-center py-2 px-1 rounded-lg text-sm font-medium transition-all ${videoLength === l.id ? "bg-white text-blue-600 shadow-sm ring-1 ring-slate-200 scale-[1.02]" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"}`,
									children: [/* @__PURE__ */ jsx("span", {
										className: "block whitespace-nowrap",
										children: l.time
									}), /* @__PURE__ */ jsx("span", {
										className: `text-[10px] sm:text-xs mt-0.5 whitespace-nowrap ${videoLength === l.id ? "text-blue-400" : "text-slate-400"}`,
										children: l.desc
									})]
								}, l.id))
							})] }),
							/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
								className: "block text-sm font-medium text-slate-700 mb-3",
								children: "โทนผู้พูด (Speaker Tone)"
							}), /* @__PURE__ */ jsx("div", {
								className: "grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-xl",
								children: tones.map((t) => /* @__PURE__ */ jsxs("button", {
									type: "button",
									onClick: () => setSpeakerTone(t.id),
									className: `flex flex-col items-center justify-center py-2 px-2 rounded-lg text-sm font-medium transition-all ${speakerTone === t.id ? t.id === "ผู้หญิง" ? "bg-pink-50 text-pink-600 shadow-sm ring-1 ring-pink-200 scale-[1.02]" : "bg-blue-50 text-blue-600 shadow-sm ring-1 ring-blue-200 scale-[1.02]" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"}`,
									children: [/* @__PURE__ */ jsxs("div", {
										className: "flex items-center gap-1.5",
										children: [t.icon, /* @__PURE__ */ jsx("span", {
											className: "block whitespace-nowrap",
											children: t.label
										})]
									}), /* @__PURE__ */ jsx("span", {
										className: `text-[10px] sm:text-xs mt-0.5 whitespace-nowrap ${speakerTone === t.id ? t.id === "ผู้หญิง" ? "text-pink-400" : "text-blue-400" : "text-slate-400"}`,
										children: t.desc
									})]
								}, t.id))
							})] }),
							effectiveTier !== "free" && /* @__PURE__ */ jsxs("div", {
								className: "p-4 bg-blue-50 border border-blue-100 rounded-lg",
								children: [/* @__PURE__ */ jsxs("label", {
									className: "block text-sm font-bold text-blue-800 mb-2 flex items-center",
									children: [/* @__PURE__ */ jsx("span", {
										className: "mr-2",
										children: "🎯"
									}), " กลุ่มเป้าหมาย (Plus/Pro Feature)"]
								}), /* @__PURE__ */ jsx("input", {
									type: "text",
									value: targetAudience,
									onChange: (e) => setTargetAudience(e.target.value),
									className: "w-full px-4 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none",
									placeholder: "เช่น พนักงานออฟฟิศปวดหลัง, แม่ลูกอ่อน"
								})]
							}),
							/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
								className: "block text-sm font-medium text-slate-700 mb-3",
								children: "สไตล์การนำเสนอ (Mode)"
							}), /* @__PURE__ */ jsx("div", {
								className: "space-y-3",
								children: modes.map((m) => {
									const isDisabled = m.isProOnly && effectiveTier !== "pro";
									return /* @__PURE__ */ jsxs("label", {
										className: `flex items-start p-3 border rounded-lg transition-all ${isDisabled ? "opacity-50 cursor-not-allowed bg-slate-50" : "cursor-pointer"} ${mode === m.id ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500" : "border-slate-200 hover:bg-slate-50"}`,
										children: [/* @__PURE__ */ jsx("input", {
											type: "radio",
											name: "mode",
											value: m.id,
											checked: mode === m.id,
											disabled: isDisabled,
											onChange: (e) => setMode(e.target.value),
											className: "mt-1 h-4 w-4 text-blue-600 border-slate-300 focus:ring-blue-500 disabled:bg-slate-200"
										}), /* @__PURE__ */ jsxs("div", {
											className: "ml-3 flex items-start gap-3 w-full",
											children: [/* @__PURE__ */ jsx("div", {
												className: "mt-0.5 shrink-0",
												children: m.icon
											}), /* @__PURE__ */ jsxs("div", {
												className: "w-full",
												children: [/* @__PURE__ */ jsxs("span", {
													className: "block text-sm font-bold text-slate-900 flex justify-between items-center",
													children: [m.name, m.isProOnly && /* @__PURE__ */ jsx("span", {
														className: "text-[10px] bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white px-2 py-0.5 rounded-full font-bold shadow-sm",
														children: "PRO"
													})]
												}), /* @__PURE__ */ jsx("span", {
													className: "block text-sm text-slate-500 mt-0.5 leading-snug",
													children: m.description
												})]
											})]
										})]
									}, m.id);
								})
							})] }),
							mode === "เปรียบเทียบชัดๆ" && /* @__PURE__ */ jsxs("div", {
								className: "animate-fade-in-up",
								children: [/* @__PURE__ */ jsx("label", {
									className: "block text-sm font-medium text-slate-700 mb-2",
									children: "คู่แข่ง / สินค้าที่นำมาเปรียบเทียบ"
								}), /* @__PURE__ */ jsx("input", {
									type: "text",
									required: true,
									value: competitor,
									onChange: (e) => setCompetitor(e.target.value),
									className: "w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none",
									placeholder: "เช่น เซรั่มทั่วไปตามท้องตลาด"
								})]
							}),
							mode === "โครงสร้างเจาะลึก" && /* @__PURE__ */ jsxs("div", {
								className: "animate-fade-in-up p-4 bg-purple-50/50 border border-purple-100 rounded-xl space-y-4",
								children: [
									/* @__PURE__ */ jsxs("div", {
										className: "flex items-center gap-2 mb-2",
										children: [/* @__PURE__ */ jsx("span", {
											className: "text-purple-600",
											children: /* @__PURE__ */ jsx("svg", {
												className: "w-5 h-5",
												fill: "none",
												stroke: "currentColor",
												viewBox: "0 0 24 24",
												children: /* @__PURE__ */ jsx("path", {
													strokeLinecap: "round",
													strokeLinejoin: "round",
													strokeWidth: "2",
													d: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
												})
											})
										}), /* @__PURE__ */ jsx("label", {
											className: "block text-sm font-bold text-purple-900",
											children: "ข้อมูลเจาะลึก (โหมดเปลี่ยนความเชื่อ)"
										})]
									}),
									/* @__PURE__ */ jsxs("div", { children: [
										/* @__PURE__ */ jsx("label", {
											className: "block text-sm font-medium text-slate-700 mb-1.5",
											children: "1. ความเชื่อผิดๆ ของลูกค้า (False Belief)"
										}),
										/* @__PURE__ */ jsx("p", {
											className: "text-[11px] sm:text-xs text-slate-500 mb-2",
											children: "สิ่งที่ลูกค้ามักจะเข้าใจผิด และเป็นข้ออ้างที่ไม่ยอมซื้อสินค้าของเรา"
										}),
										/* @__PURE__ */ jsx("textarea", {
											required: true,
											rows: "2",
											value: falseBelief,
											onChange: (e) => setFalseBelief(e.target.value),
											className: "w-full px-4 py-3 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none resize-none text-sm",
											placeholder: "เช่น คิดว่าลดน้ำหนักต้องอดข้าวเย็น, คิดว่าสิวอุดตันต้องบีบออก"
										})
									] }),
									/* @__PURE__ */ jsxs("div", { children: [
										/* @__PURE__ */ jsx("label", {
											className: "block text-sm font-medium text-slate-700 mb-1.5",
											children: "2. กลไก/ความลับที่ลบล้างความเชื่อนั้น (Mechanism)"
										}),
										/* @__PURE__ */ jsx("p", {
											className: "text-[11px] sm:text-xs text-slate-500 mb-2",
											children: "จุดแข็ง นวัตกรรม หรือหลักการทำงานของสินค้า ที่พิสูจน์ว่าความเชื่อเดิมนั้นผิด"
										}),
										/* @__PURE__ */ jsx("textarea", {
											required: true,
											rows: "2",
											value: mechanism,
											onChange: (e) => setMechanism(e.target.value),
											className: "w-full px-4 py-3 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none resize-none text-sm",
											placeholder: "เช่น ใช้สารสกัด X ที่ดูดซึมตอนหลับ, หรือมีนวัตกรรมดันหัวสิวให้แห้งเอง"
										})
									] })
								]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "flex flex-col gap-3",
								children: [/* @__PURE__ */ jsx("button", {
									type: "submit",
									onClick: (e) => handleGenerate(e, false),
									disabled: isGenerating || !user || !profile,
									className: `w-full py-3 rounded-lg text-white font-medium transition-all flex flex-col items-center justify-center gap-1 leading-tight ${isGenerating ? "bg-blue-400 cursor-wait" : !user || !profile ? "bg-slate-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`,
									children: generatingMode === "single" ? /* @__PURE__ */ jsxs("div", {
										className: "flex items-center justify-center gap-2",
										children: [/* @__PURE__ */ jsx("svg", {
											className: "w-5 h-5 animate-spin",
											fill: "none",
											stroke: "currentColor",
											viewBox: "0 0 24 24",
											children: /* @__PURE__ */ jsx("path", {
												strokeLinecap: "round",
												strokeLinejoin: "round",
												strokeWidth: "2",
												d: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
											})
										}), /* @__PURE__ */ jsx("span", { children: "AI กำลังร่างสคริปต์..." })]
									}) : !profile ? /* @__PURE__ */ jsxs("div", {
										className: "flex items-center justify-center gap-2",
										children: [/* @__PURE__ */ jsx("svg", {
											className: "w-5 h-5 animate-spin",
											fill: "none",
											stroke: "currentColor",
											viewBox: "0 0 24 24",
											children: /* @__PURE__ */ jsx("path", {
												strokeLinecap: "round",
												strokeLinejoin: "round",
												strokeWidth: "2",
												d: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
											})
										}), /* @__PURE__ */ jsx("span", { children: "กำลังโหลดข้อมูลบัญชี..." })]
									}) : /* @__PURE__ */ jsxs("div", {
										className: "flex items-center justify-center gap-2",
										children: [/* @__PURE__ */ jsx("svg", {
											className: "w-5 h-5",
											fill: "none",
											stroke: "currentColor",
											viewBox: "0 0 24 24",
											children: /* @__PURE__ */ jsx("path", {
												strokeLinecap: "round",
												strokeLinejoin: "round",
												strokeWidth: "2",
												d: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
											})
										}), /* @__PURE__ */ jsx("span", { children: "สร้างสคริปต์ปกติ (หัก 1 เครดิต)" })]
									})
								}), effectiveTier === "pro" && /* @__PURE__ */ jsx("button", {
									type: "button",
									onClick: (e) => handleGenerate(e, true),
									disabled: isGenerating || !user || !profile,
									className: `w-full py-2.5 rounded-lg text-white font-bold transition-all flex flex-col items-center justify-center gap-0.5 shadow-sm border leading-tight ${isGenerating ? "bg-amber-400 cursor-wait border-transparent" : !user || !profile ? "bg-slate-400 cursor-not-allowed border-transparent" : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 border-amber-600/20"}`,
									children: generatingMode === "multi" ? /* @__PURE__ */ jsxs("div", {
										className: "flex items-center justify-center gap-2 py-1",
										children: [/* @__PURE__ */ jsx("svg", {
											className: "w-5 h-5 animate-spin",
											fill: "none",
											stroke: "currentColor",
											viewBox: "0 0 24 24",
											children: /* @__PURE__ */ jsx("path", {
												strokeLinecap: "round",
												strokeLinejoin: "round",
												strokeWidth: "2",
												d: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
											})
										}), /* @__PURE__ */ jsx("span", { children: "AI กำลังร่างสคริปต์ 3 สไตล์..." })]
									}) : !profile ? /* @__PURE__ */ jsxs("div", {
										className: "flex items-center justify-center gap-2 py-1",
										children: [/* @__PURE__ */ jsx("svg", {
											className: "w-5 h-5 animate-spin",
											fill: "none",
											stroke: "currentColor",
											viewBox: "0 0 24 24",
											children: /* @__PURE__ */ jsx("path", {
												strokeLinecap: "round",
												strokeLinejoin: "round",
												strokeWidth: "2",
												d: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
											})
										}), /* @__PURE__ */ jsx("span", { children: "กำลังโหลดข้อมูลบัญชี..." })]
									}) : /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsxs("div", {
										className: "flex items-center justify-center gap-1.5 text-[15px]",
										children: [/* @__PURE__ */ jsx("svg", {
											xmlns: "http://www.w3.org/2000/svg",
											viewBox: "0 0 24 24",
											fill: "currentColor",
											className: "w-5 h-5 text-yellow-200",
											children: /* @__PURE__ */ jsx("path", {
												fillRule: "evenodd",
												d: "M9 4.5a.75.75 0 0 1 .721.544l.813 2.846a3.75 3.75 0 0 0 2.576 2.576l2.846.813a.75.75 0 0 1 0 1.442l-2.846.813a3.75 3.75 0 0 0-2.576 2.576l-.813 2.846a.75.75 0 0 1-1.442 0l-.813-2.846a3.75 3.75 0 0 0-2.576-2.576l-2.846-.813a.75.75 0 0 1 0-1.442l2.846-.813A3.75 3.75 0 0 0 7.466 7.89l.813-2.846A.75.75 0 0 1 9 4.5ZM18 1.5a.75.75 0 0 1 .728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 0 1 0 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 0 1-1.456 0l-.258-1.036a2.625 2.625 0 0 0-1.91-1.91l-1.036-.258a.75.75 0 0 1 0-1.456l1.036-.258a2.625 2.625 0 0 0 1.91-1.91l.258-1.036A.75.75 0 0 1 18 1.5ZM16.5 15a.75.75 0 0 1 .712.513l.394 1.183c.15.447.5.799.948.948l1.183.395a.75.75 0 0 1 0 1.422l-1.183.395c-.447.15-.799.5-.948.948l-.395 1.183a.75.75 0 0 1-1.422 0l-.395-1.183a1.5 1.5 0 0 0-.948-.948l-1.183-.395a.75.75 0 0 1 0-1.422l1.183-.395c.447-.15.799-.5.948-.948l.395-1.183A.75.75 0 0 1 16.5 15Z",
												clipRule: "evenodd"
											})
										}), /* @__PURE__ */ jsx("span", { children: "สร้างทีเดียว 3 สไตล์" })]
									}), /* @__PURE__ */ jsx("span", {
										className: "text-[11px] font-normal opacity-90",
										children: "(Pro • หัก 2 เครดิต)"
									})] })
								})]
							})
						]
					})
				}), /* @__PURE__ */ jsx("div", {
					className: "flex flex-col h-full",
					children: !generatedScript && !isGenerating ? /* @__PURE__ */ jsxs("div", {
						className: "flex-1 bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 border-dashed rounded-2xl flex flex-col items-center justify-center p-12 text-center h-full min-h-[400px]",
						children: [
							/* @__PURE__ */ jsx("div", {
								className: "w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4 text-blue-500",
								children: /* @__PURE__ */ jsx("svg", {
									className: "w-8 h-8",
									fill: "none",
									stroke: "currentColor",
									viewBox: "0 0 24 24",
									children: /* @__PURE__ */ jsx("path", {
										strokeLinecap: "round",
										strokeLinejoin: "round",
										strokeWidth: "2",
										d: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
									})
								})
							}),
							/* @__PURE__ */ jsx("h3", {
								className: "text-lg font-bold text-slate-800 mb-2",
								children: "พร้อมสร้างสคริปต์ไวรัล"
							}),
							/* @__PURE__ */ jsx("p", {
								className: "text-slate-500 max-w-sm",
								children: "กรอกข้อมูลด้านซ้ายแล้วกดสร้างสคริปต์ AI จะเขียนสคริปต์ป้ายยาให้คุณภายใน 5 วินาที"
							})
						]
					}) : isGenerating ? /* @__PURE__ */ jsxs("div", {
						className: "flex-1 bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center p-12 min-h-[400px] shadow-sm",
						children: [/* @__PURE__ */ jsx("div", {
							className: "mb-4 text-blue-600 flex justify-center",
							children: /* @__PURE__ */ jsx("svg", {
								className: "w-12 h-12 animate-spin",
								fill: "none",
								stroke: "currentColor",
								viewBox: "0 0 24 24",
								children: /* @__PURE__ */ jsx("path", {
									strokeLinecap: "round",
									strokeLinejoin: "round",
									strokeWidth: "2",
									d: "M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"
								})
							})
						}), /* @__PURE__ */ jsx("p", {
							className: "text-lg font-medium text-slate-700 animate-pulse",
							children: "กำลังสวมวิญญาณแม่ค้าตัวท็อป..."
						})]
					}) : /* @__PURE__ */ jsxs("div", {
						className: "bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden flex flex-col shadow-sm h-full",
						children: [
							/* @__PURE__ */ jsxs("div", {
								className: "bg-white border-b border-slate-200 flex flex-col sticky top-0 z-10",
								children: [/* @__PURE__ */ jsxs("div", {
									className: "p-4 flex justify-between items-center",
									children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsxs("h2", {
										className: "font-bold text-slate-800 flex items-center gap-2",
										children: [/* @__PURE__ */ jsx("span", {
											className: "text-blue-600",
											children: /* @__PURE__ */ jsx("svg", {
												className: "w-5 h-5",
												fill: "none",
												stroke: "currentColor",
												viewBox: "0 0 24 24",
												children: /* @__PURE__ */ jsx("path", {
													strokeLinecap: "round",
													strokeLinejoin: "round",
													strokeWidth: "2",
													d: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
												})
											})
										}), " สคริปต์พร้อมถ่าย"]
									}), /* @__PURE__ */ jsxs("p", {
										className: "text-xs text-slate-500 mt-1",
										children: [
											"ความยาวประมาณ: ",
											generatedScript.isMulti ? generatedScript[activeTab]?.metadata?.estimated_duration_seconds : generatedScript.metadata?.estimated_duration_seconds,
											" วินาที"
										]
									})] }), /* @__PURE__ */ jsxs("button", {
										onClick: copyToClipboard,
										className: "bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-sm active:scale-95 flex items-center gap-2",
										children: [
											/* @__PURE__ */ jsx("svg", {
												className: "w-4 h-4",
												fill: "none",
												stroke: "currentColor",
												viewBox: "0 0 24 24",
												children: /* @__PURE__ */ jsx("path", {
													strokeLinecap: "round",
													strokeLinejoin: "round",
													strokeWidth: "2",
													d: "M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
												})
											}),
											" ",
											/* @__PURE__ */ jsx("span", { children: "คัดลอกทั้งหมด" })
										]
									})]
								}), generatedScript.isMulti && /* @__PURE__ */ jsxs("div", {
									className: "flex px-2 pb-2 gap-2 bg-slate-50",
									children: [
										/* @__PURE__ */ jsxs("button", {
											onClick: () => setActiveTab("funny"),
											className: `flex-1 py-2 text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${activeTab === "funny" ? "bg-amber-100 text-amber-800 border-b-2 border-amber-500" : "text-slate-500 hover:bg-slate-100"}`,
											children: [/* @__PURE__ */ jsx("svg", {
												xmlns: "http://www.w3.org/2000/svg",
												viewBox: "0 0 24 24",
												fill: "currentColor",
												className: "w-5 h-5 text-amber-500",
												children: /* @__PURE__ */ jsx("path", {
													fillRule: "evenodd",
													d: "M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm-2.625 6c-.54 0-.828.419-.936.634a1.96 1.96 0 0 0-.189.866c0 .298.059.605.189.866.108.215.395.634.936.634.54 0 .828-.419.936-.634.13-.26.189-.568.189-.866 0-.298-.059-.605-.189-.866-.108-.215-.395-.634-.936-.634Zm4.314.634c.108-.215.395-.634.936-.634.54 0 .828.419.936.634.13.26.189.568.189.866 0 .298-.059.605-.189.866-.108.215-.395.634-.936.634-.54 0-.828-.419-.936-.634a1.96 1.96 0 0 1-.189-.866c0-.298.059-.605.189-.866ZM7.65 15.385a.75.75 0 0 1 1.06-.062 3.736 3.736 0 0 0 2.665 1.099h1.25a3.736 3.736 0 0 0 2.665-1.099.75.75 0 1 1 1.06 1.06 5.236 5.236 0 0 1-3.725 1.539h-1.25a5.236 5.236 0 0 1-3.725-1.539.75.75 0 0 1-.061-1.06Z",
													clipRule: "evenodd"
												})
											}), /* @__PURE__ */ jsx("span", { children: "สายฮา/กวนๆ" })]
										}),
										/* @__PURE__ */ jsxs("button", {
											onClick: () => setActiveTab("review"),
											className: `flex-1 py-2 text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${activeTab === "review" ? "bg-blue-100 text-blue-800 border-b-2 border-blue-500" : "text-slate-500 hover:bg-slate-100"}`,
											children: [/* @__PURE__ */ jsx("svg", {
												xmlns: "http://www.w3.org/2000/svg",
												viewBox: "0 0 24 24",
												fill: "currentColor",
												className: "w-5 h-5 text-blue-500",
												children: /* @__PURE__ */ jsx("path", {
													fillRule: "evenodd",
													d: "M8.603 3.799A4.49 4.49 0 0 1 12 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 0 1 3.498 1.307 4.491 4.491 0 0 1 1.307 3.497A4.49 4.49 0 0 1 21.75 12a4.49 4.49 0 0 1-1.549 3.397 4.491 4.491 0 0 1-1.307 3.497 4.491 4.491 0 0 1-3.497 1.307A4.49 4.49 0 0 1 12 21.75a4.49 4.49 0 0 1-3.397-1.549 4.49 4.49 0 0 1-3.498-1.306 4.491 4.491 0 0 1-1.307-3.498A4.49 4.49 0 0 1 2.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 0 1 1.307-3.497 4.49 4.49 0 0 1 3.497-1.307Zm7.007 6.387a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z",
													clipRule: "evenodd"
												})
											}), /* @__PURE__ */ jsx("span", { children: "รีวิวจริงใจ" })]
										}),
										/* @__PURE__ */ jsxs("button", {
											onClick: () => setActiveTab("fomo"),
											className: `flex-1 py-2 text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${activeTab === "fomo" ? "bg-rose-100 text-rose-800 border-b-2 border-rose-500" : "text-slate-500 hover:bg-slate-100"}`,
											children: [/* @__PURE__ */ jsx("svg", {
												xmlns: "http://www.w3.org/2000/svg",
												viewBox: "0 0 24 24",
												fill: "currentColor",
												className: "w-5 h-5 text-rose-500",
												children: /* @__PURE__ */ jsx("path", {
													fillRule: "evenodd",
													d: "M12.963 2.286a.75.75 0 0 0-1.071-.136 9.742 9.742 0 0 0-3.539 6.176 7.547 7.547 0 0 1-1.705-1.715.75.75 0 0 0-1.152-.082A9 9 0 1 0 15.68 4.534a7.46 7.46 0 0 1-2.717-2.248ZM15.75 14.25a3.75 3.75 0 1 1-7.313-1.172c.628.465 1.35.81 2.133 1a5.99 5.99 0 0 1 1.925-3.546 3.75 3.75 0 0 1 3.255 3.718Z",
													clipRule: "evenodd"
												})
											}), /* @__PURE__ */ jsx("span", { children: "เร่งด่วน (FOMO)" })]
										})
									]
								})]
							}),
							bannedWarnings && bannedWarnings.length > 0 && /* @__PURE__ */ jsxs("div", {
								className: "m-4 p-4 bg-red-50 border border-red-200 rounded-xl",
								children: [/* @__PURE__ */ jsxs("h4", {
									className: "font-bold text-red-700 flex items-center gap-2 mb-2",
									children: [
										/* @__PURE__ */ jsx("svg", {
											className: "w-5 h-5 shrink-0",
											fill: "none",
											stroke: "currentColor",
											viewBox: "0 0 24 24",
											children: /* @__PURE__ */ jsx("path", {
												strokeLinecap: "round",
												strokeLinejoin: "round",
												strokeWidth: "2",
												d: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
											})
										}),
										" ",
										/* @__PURE__ */ jsx("span", { children: "ระวังคำสุ่มเสี่ยงโดนแบน (ปรับแก้ก่อนถ่าย)" })
									]
								}), /* @__PURE__ */ jsx("ul", {
									className: "list-disc list-inside text-sm text-red-600 space-y-1",
									children: bannedWarnings.map((w, idx) => /* @__PURE__ */ jsxs("li", { children: [
										/* @__PURE__ */ jsx("strong", { children: w.word }),
										": ",
										w.reason
									] }, idx))
								})]
							}),
							/* @__PURE__ */ jsx("div", {
								className: "p-4 space-y-4 overflow-y-auto flex-1 max-h-[700px]",
								children: (generatedScript.isMulti ? generatedScript[activeTab]?.script_blocks : generatedScript.script_blocks)?.map((block, index) => {
									let phaseIcon = /* @__PURE__ */ jsx("svg", {
										className: "w-3.5 h-3.5 shrink-0",
										fill: "none",
										stroke: "currentColor",
										viewBox: "0 0 24 24",
										children: /* @__PURE__ */ jsx("path", {
											strokeLinecap: "round",
											strokeLinejoin: "round",
											strokeWidth: "2",
											d: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
										})
									});
									let phaseColor = "bg-slate-100 text-slate-600";
									if (block.phase === "Hook") {
										phaseIcon = /* @__PURE__ */ jsx("svg", {
											className: "w-3.5 h-3.5 shrink-0",
											fill: "none",
											stroke: "currentColor",
											viewBox: "0 0 24 24",
											children: /* @__PURE__ */ jsx("path", {
												strokeLinecap: "round",
												strokeLinejoin: "round",
												strokeWidth: "2",
												d: "M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
											})
										});
										phaseColor = "bg-rose-100 text-rose-700";
									}
									if (block.phase === "Agitation") {
										phaseIcon = /* @__PURE__ */ jsxs("svg", {
											className: "w-3.5 h-3.5 shrink-0",
											fill: "none",
											stroke: "currentColor",
											viewBox: "0 0 24 24",
											children: [/* @__PURE__ */ jsx("path", {
												strokeLinecap: "round",
												strokeLinejoin: "round",
												strokeWidth: "2",
												d: "M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"
											}), /* @__PURE__ */ jsx("path", {
												strokeLinecap: "round",
												strokeLinejoin: "round",
												strokeWidth: "2",
												d: "M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z"
											})]
										});
										phaseColor = "bg-orange-100 text-orange-700";
									}
									if (block.phase === "Reveal") {
										phaseIcon = /* @__PURE__ */ jsx("svg", {
											className: "w-3.5 h-3.5 shrink-0",
											fill: "none",
											stroke: "currentColor",
											viewBox: "0 0 24 24",
											children: /* @__PURE__ */ jsx("path", {
												strokeLinecap: "round",
												strokeLinejoin: "round",
												strokeWidth: "2",
												d: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
											})
										});
										phaseColor = "bg-blue-100 text-blue-700";
									}
									if (block.phase === "FOMO") {
										phaseIcon = /* @__PURE__ */ jsx("svg", {
											className: "w-3.5 h-3.5 shrink-0",
											fill: "none",
											stroke: "currentColor",
											viewBox: "0 0 24 24",
											children: /* @__PURE__ */ jsx("path", {
												strokeLinecap: "round",
												strokeLinejoin: "round",
												strokeWidth: "2",
												d: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
											})
										});
										phaseColor = "bg-amber-100 text-amber-700";
									}
									if (block.phase === "CTA") {
										phaseIcon = /* @__PURE__ */ jsx("svg", {
											className: "w-3.5 h-3.5 shrink-0",
											fill: "none",
											stroke: "currentColor",
											viewBox: "0 0 24 24",
											children: /* @__PURE__ */ jsx("path", {
												strokeLinecap: "round",
												strokeLinejoin: "round",
												strokeWidth: "2",
												d: "M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
											})
										});
										phaseColor = "bg-emerald-100 text-emerald-700";
									}
									return /* @__PURE__ */ jsxs("div", {
										className: "bg-white rounded-2xl p-5 shadow-sm border border-slate-100 relative group transition-all hover:shadow-md",
										children: [
											/* @__PURE__ */ jsx("div", {
												className: "absolute -left-3 top-5 w-6 h-6 bg-slate-800 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-sm",
												children: index + 1
											}),
											/* @__PURE__ */ jsx("div", {
												className: "flex justify-between items-start mb-3 ml-2",
												children: /* @__PURE__ */ jsxs("div", {
													className: "flex items-center gap-2",
													children: [/* @__PURE__ */ jsxs("span", {
														className: `px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1 ${phaseColor}`,
														children: [
															phaseIcon,
															" ",
															block.phase
														]
													}), /* @__PURE__ */ jsxs("span", {
														className: "text-xs font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded-md border border-slate-100 flex items-center gap-1",
														children: [
															/* @__PURE__ */ jsx("svg", {
																className: "w-3.5 h-3.5",
																fill: "none",
																stroke: "currentColor",
																viewBox: "0 0 24 24",
																children: /* @__PURE__ */ jsx("path", {
																	strokeLinecap: "round",
																	strokeLinejoin: "round",
																	strokeWidth: "2",
																	d: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
																})
															}),
															" ",
															block.timestamp
														]
													})]
												})
											}),
											/* @__PURE__ */ jsxs("div", {
												className: "ml-2",
												children: [/* @__PURE__ */ jsx("p", {
													className: "text-xl font-medium text-slate-800 leading-relaxed mb-4",
													dangerouslySetInnerHTML: { __html: `"${highlightBannedWords(block.audio_spoken, bannedWarnings)}"` }
												}), /* @__PURE__ */ jsxs("div", {
													className: "flex flex-col sm:flex-row gap-3 pt-3 border-t border-slate-50",
													children: [/* @__PURE__ */ jsxs("div", {
														className: "flex-1 bg-blue-50/50 rounded-xl p-3 flex items-start gap-2 border border-blue-100/50",
														children: [/* @__PURE__ */ jsx("span", {
															className: "text-blue-500 shrink-0 mt-0.5",
															children: /* @__PURE__ */ jsx("svg", {
																className: "w-4 h-4",
																fill: "none",
																stroke: "currentColor",
																viewBox: "0 0 24 24",
																children: /* @__PURE__ */ jsx("path", {
																	strokeLinecap: "round",
																	strokeLinejoin: "round",
																	strokeWidth: "2",
																	d: "M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
																})
															})
														}), /* @__PURE__ */ jsxs("div", {
															className: "text-xs text-slate-600",
															children: [/* @__PURE__ */ jsx("strong", {
																className: "block text-slate-700 mb-0.5",
																children: "ภาพ/การกระทำ:"
															}), block.visual_direction]
														})]
													}), /* @__PURE__ */ jsxs("div", {
														className: "flex-1 bg-purple-50/50 rounded-xl p-3 flex items-start gap-2 border border-purple-100/50",
														children: [/* @__PURE__ */ jsx("span", {
															className: "text-sm shrink-0",
															children: "🎭"
														}), /* @__PURE__ */ jsxs("div", {
															className: "text-xs text-slate-600",
															children: [/* @__PURE__ */ jsx("strong", {
																className: "block text-slate-700 mb-0.5",
																children: "อารมณ์:"
															}), block.subtext_emotion]
														})]
													})]
												})]
											})
										]
									}, index);
								})
							})
						]
					})
				})]
			}),
			showTerminal && /* @__PURE__ */ jsx("div", {
				className: "fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-300",
				children: /* @__PURE__ */ jsxs("div", {
					className: "w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col relative animate-in fade-in zoom-in-95 duration-200",
					children: [
						/* @__PURE__ */ jsx("div", {
							className: "bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-4 border-b border-amber-100/50 flex items-center justify-between",
							children: /* @__PURE__ */ jsxs("div", {
								className: "flex items-center gap-3",
								children: [/* @__PURE__ */ jsx("div", {
									className: "w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center animate-pulse",
									children: /* @__PURE__ */ jsx("svg", {
										className: "w-4 h-4",
										fill: "none",
										stroke: "currentColor",
										viewBox: "0 0 24 24",
										children: /* @__PURE__ */ jsx("path", {
											strokeLinecap: "round",
											strokeLinejoin: "round",
											strokeWidth: "2",
											d: "M13 10V3L4 14h7v7l9-11h-7z"
										})
									})
								}), /* @__PURE__ */ jsx("h3", {
									className: "font-bold text-amber-900",
									children: "AI กำลังวิเคราะห์ข้อมูลสินค้า"
								})]
							})
						}),
						/* @__PURE__ */ jsx("div", {
							className: "p-6",
							children: /* @__PURE__ */ jsx("div", {
								className: "flex flex-col gap-4",
								children: /* @__PURE__ */ jsxs("div", {
									className: "flex items-start gap-3",
									children: [/* @__PURE__ */ jsx("div", {
										className: "mt-1",
										children: isAnalyzing ? /* @__PURE__ */ jsxs("svg", {
											className: "animate-spin h-5 w-5 text-amber-500",
											xmlns: "http://www.w3.org/2000/svg",
											fill: "none",
											viewBox: "0 0 24 24",
											children: [/* @__PURE__ */ jsx("circle", {
												className: "opacity-25",
												cx: "12",
												cy: "12",
												r: "10",
												stroke: "currentColor",
												strokeWidth: "4"
											}), /* @__PURE__ */ jsx("path", {
												className: "opacity-75",
												fill: "currentColor",
												d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
											})]
										}) : terminalText.includes("Error") ? /* @__PURE__ */ jsx("svg", {
											className: "h-5 w-5 text-red-500",
											fill: "none",
											stroke: "currentColor",
											viewBox: "0 0 24 24",
											children: /* @__PURE__ */ jsx("path", {
												strokeLinecap: "round",
												strokeLinejoin: "round",
												strokeWidth: "2",
												d: "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
											})
										}) : /* @__PURE__ */ jsx("svg", {
											className: "h-5 w-5 text-green-500",
											fill: "none",
											stroke: "currentColor",
											viewBox: "0 0 24 24",
											children: /* @__PURE__ */ jsx("path", {
												strokeLinecap: "round",
												strokeLinejoin: "round",
												strokeWidth: "2",
												d: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
											})
										})
									}), /* @__PURE__ */ jsx("div", {
										className: "flex-1 bg-slate-50 rounded-xl p-4 border border-slate-100 shadow-inner h-48 overflow-y-auto",
										children: /* @__PURE__ */ jsx("p", {
											className: "text-sm text-slate-600 whitespace-pre-wrap leading-relaxed font-medium",
											children: terminalText || "กำลังเตรียมข้อมูล..."
										})
									})]
								})
							})
						}),
						isAnalyzing && /* @__PURE__ */ jsx("div", { className: "absolute bottom-0 left-0 h-1 bg-gradient-to-r from-amber-400 to-orange-500 animate-[pulse_2s_ease-in-out_infinite] w-full" })
					]
				})
			})
		]
	});
}
var create_default = UNSAFE_withComponentProps(CreateScript);
//#endregion
//#region app/routes/_index.jsx
var _index_exports = /* @__PURE__ */ __exportAll({ default: () => _index_default });
function Home() {
	return /* @__PURE__ */ jsxs(Fragment, { children: [
		/* @__PURE__ */ jsx("title", { children: "Auto Script | AI เขียนสคริปต์วิดีโอ TikTok, Reels, ปักตะกร้า" }),
		/* @__PURE__ */ jsx("meta", {
			name: "description",
			content: "Auto Script ช่วยสร้างสคริปต์รีวิวสินค้า ปิดการขายง่ายขึ้นด้วย AI ฝังจิตวิทยาการขาย ไม่ต้องคิดคอนเทนต์เอง"
		}),
		/* @__PURE__ */ jsxs("div", {
			className: "flex flex-col items-center justify-center text-center mt-6 sm:mt-12 px-2",
			children: [
				/* @__PURE__ */ jsxs("h1", {
					className: "text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mb-4 leading-snug",
					children: [
						"เขียนสคริปต์รีวิวสินค้า ",
						/* @__PURE__ */ jsx("br", { className: "hidden sm:block" }),
						/* @__PURE__ */ jsx("span", {
							className: "text-blue-600",
							children: "ให้การทำคลิปง่ายขึ้นด้วย"
						}),
						/* @__PURE__ */ jsx("span", {
							className: "inline-block bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-3 py-0.5 rounded-xl ml-2 shadow-lg",
							children: "AI"
						})
					]
				}),
				/* @__PURE__ */ jsx("p", {
					className: "text-base sm:text-lg text-slate-600 max-w-xl mb-8 px-4 leading-relaxed mt-2",
					children: "ประหยัดเวลาคิดคอนเทนต์ เพียงกรอกจุดเด่นสินค้า ระบบจะจัดโครงสร้างสคริปต์พร้อมถ่ายให้ทันที"
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "flex flex-row gap-3 justify-center w-full px-4 mb-4",
					children: [/* @__PURE__ */ jsx(Link, {
						to: "/create",
						className: "bg-blue-600 text-white px-5 py-2.5 sm:px-8 sm:py-3 rounded-lg text-sm sm:text-lg font-semibold hover:bg-blue-700 transition-colors shadow-md whitespace-nowrap",
						children: "เริ่มสร้างสคริปต์"
					}), /* @__PURE__ */ jsx(Link, {
						to: "/pricing",
						className: "bg-white text-slate-700 border border-slate-300 px-5 py-2.5 sm:px-8 sm:py-3 rounded-lg text-sm sm:text-lg font-semibold hover:bg-slate-50 transition-colors whitespace-nowrap",
						children: "ดูแพ็กเกจ"
					})]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "mt-12 sm:mt-24 mb-10 w-full max-w-6xl mx-auto px-4 text-left",
					children: [/* @__PURE__ */ jsxs("div", {
						className: "text-center mb-8",
						children: [/* @__PURE__ */ jsxs("h2", {
							className: "text-[1.2rem] xs:text-xl sm:text-3xl font-bold text-slate-900 mb-2 px-1 leading-snug",
							children: [
								/* @__PURE__ */ jsx("span", {
									className: "whitespace-nowrap",
									children: "ทำไมสคริปต์ของเราถึง"
								}),
								" ",
								/* @__PURE__ */ jsx("br", { className: "sm:hidden" }),
								/* @__PURE__ */ jsx("span", {
									className: "text-blue-600 whitespace-nowrap",
									children: "\"ปิดการขายได้ดีกว่า\"?"
								})
							]
						}), /* @__PURE__ */ jsx("p", {
							className: "text-sm sm:text-lg text-slate-600",
							children: "โจทย์: สกินแคร์ลดสิว ยุบไวใน 3 วัน หน้าไม่แห้งลอก"
						})]
					}), /* @__PURE__ */ jsxs("div", {
						className: "flex flex-col lg:flex-row gap-8",
						children: [
							/* @__PURE__ */ jsxs("div", {
								className: "flex-1 bg-white p-6 rounded-2xl border-2 border-dashed border-slate-200 opacity-80 hover:opacity-100 transition-opacity relative overflow-hidden",
								children: [
									/* @__PURE__ */ jsx("div", { className: "absolute top-0 left-0 w-full h-1 bg-slate-200" }),
									/* @__PURE__ */ jsxs("div", {
										className: "flex items-center gap-2 mb-6",
										children: [
											/* @__PURE__ */ jsx("span", {
												className: "text-slate-400 shrink-0",
												children: /* @__PURE__ */ jsxs("svg", {
													className: "w-7 h-7",
													fill: "none",
													stroke: "currentColor",
													viewBox: "0 0 24 24",
													strokeWidth: "2",
													strokeLinecap: "round",
													strokeLinejoin: "round",
													children: [
														/* @__PURE__ */ jsx("path", { d: "M12 8V4H8" }),
														/* @__PURE__ */ jsx("rect", {
															width: "16",
															height: "12",
															x: "4",
															y: "8",
															rx: "2"
														}),
														/* @__PURE__ */ jsx("path", { d: "M2 14h2" }),
														/* @__PURE__ */ jsx("path", { d: "M20 14h2" }),
														/* @__PURE__ */ jsx("path", { d: "M15 13v2" }),
														/* @__PURE__ */ jsx("path", { d: "M9 13v2" })
													]
												})
											}),
											/* @__PURE__ */ jsx("h3", {
												className: "font-bold text-slate-500 text-base sm:text-lg leading-tight",
												children: "AI ธรรมดาทั่วไป"
											}),
											/* @__PURE__ */ jsx("span", {
												className: "ml-auto text-[10px] sm:text-xs font-bold bg-slate-100 text-slate-400 px-2 py-1 rounded whitespace-nowrap shrink-0",
												children: "น่าเบื่อ / ท่องจำ"
											})
										]
									}),
									/* @__PURE__ */ jsx("div", {
										className: "bg-slate-50 p-4 rounded-xl text-slate-500 italic leading-relaxed text-sm border border-slate-100",
										children: "\"สวัสดีค่ะทุกคน วันนี้จะมาแนะนำสกินแคร์ลดสิวหน้าใสตัวใหม่ล่าสุด ที่จะช่วยให้สิวของคุณยุบภายใน 3 วัน แถมหน้ายังไม่แห้งลอกอีกด้วยนะคะ เนื้อสกินแคร์ซึมไวมาก ทาแล้วสบายผิวสุดๆ สนใจสามารถกดสั่งซื้อที่ตะกร้าด้านล่างได้เลยค่ะ รีบหน่อยนะคะเดี๋ยวของหมด ขอบคุณค่ะ\""
									}),
									/* @__PURE__ */ jsxs("ul", {
										className: "mt-6 space-y-2 text-sm text-slate-500",
										children: [
											/* @__PURE__ */ jsxs("li", {
												className: "flex gap-2 items-start",
												children: [
													/* @__PURE__ */ jsx("span", {
														className: "text-red-400 mt-0.5",
														children: /* @__PURE__ */ jsx("svg", {
															className: "w-4 h-4",
															fill: "none",
															stroke: "currentColor",
															viewBox: "0 0 24 24",
															children: /* @__PURE__ */ jsx("path", {
																strokeLinecap: "round",
																strokeLinejoin: "round",
																strokeWidth: "2",
																d: "M6 18L18 6M6 6l12 12"
															})
														})
													}),
													" ",
													/* @__PURE__ */ jsx("span", { children: "ไม่มีจิตวิทยาการขาย (Hook ไม่ดึงดูด)" })
												]
											}),
											/* @__PURE__ */ jsxs("li", {
												className: "flex gap-2 items-start",
												children: [
													/* @__PURE__ */ jsx("span", {
														className: "text-red-400 mt-0.5",
														children: /* @__PURE__ */ jsx("svg", {
															className: "w-4 h-4",
															fill: "none",
															stroke: "currentColor",
															viewBox: "0 0 24 24",
															children: /* @__PURE__ */ jsx("path", {
																strokeLinecap: "round",
																strokeLinejoin: "round",
																strokeWidth: "2",
																d: "M6 18L18 6M6 6l12 12"
															})
														})
													}),
													" ",
													/* @__PURE__ */ jsx("span", { children: "เป็นทางการเกินไป ไม่เหมือนคนพูดจริง" })
												]
											}),
											/* @__PURE__ */ jsxs("li", {
												className: "flex gap-2 items-start",
												children: [
													/* @__PURE__ */ jsx("span", {
														className: "text-red-400 mt-0.5",
														children: /* @__PURE__ */ jsx("svg", {
															className: "w-4 h-4",
															fill: "none",
															stroke: "currentColor",
															viewBox: "0 0 24 24",
															children: /* @__PURE__ */ jsx("path", {
																strokeLinecap: "round",
																strokeLinejoin: "round",
																strokeWidth: "2",
																d: "M6 18L18 6M6 6l12 12"
															})
														})
													}),
													" ",
													/* @__PURE__ */ jsx("span", { children: "ไม่มีบอกว่าต้องทำท่าทางยังไงตอนถ่ายทำ" })
												]
											})
										]
									})
								]
							}),
							/* @__PURE__ */ jsx("div", {
								className: "hidden lg:flex items-center justify-center",
								children: /* @__PURE__ */ jsx("div", {
									className: "w-12 h-12 bg-white rounded-full shadow-md flex items-center justify-center font-black text-slate-300 border border-slate-100 z-10 text-xl",
									children: "VS"
								})
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "flex-1 bg-white p-6 rounded-2xl border border-blue-200 shadow-md relative overflow-hidden ring-4 ring-blue-50",
								children: [
									/* @__PURE__ */ jsx("div", { className: "absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-purple-500" }),
									/* @__PURE__ */ jsxs("div", {
										className: "flex items-center gap-2 mb-6",
										children: [
											/* @__PURE__ */ jsx("span", {
												className: "text-blue-500 shrink-0",
												children: /* @__PURE__ */ jsx("svg", {
													className: "w-7 h-7",
													fill: "none",
													stroke: "currentColor",
													viewBox: "0 0 24 24",
													children: /* @__PURE__ */ jsx("path", {
														strokeLinecap: "round",
														strokeLinejoin: "round",
														strokeWidth: "2",
														d: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
													})
												})
											}),
											/* @__PURE__ */ jsx("h3", {
												className: "font-bold text-blue-700 text-base sm:text-lg leading-tight whitespace-nowrap",
												children: "Auto Script V2"
											}),
											/* @__PURE__ */ jsx("span", {
												className: "ml-auto text-[10px] sm:text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded uppercase tracking-wide whitespace-nowrap shrink-0",
												children: "พร้อมถ่ายทำ 100%"
											})
										]
									}),
									/* @__PURE__ */ jsxs("div", {
										className: "space-y-4",
										children: [
											/* @__PURE__ */ jsxs("div", {
												className: "bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm",
												children: [
													/* @__PURE__ */ jsxs("div", {
														className: "flex justify-between items-center mb-2",
														children: [/* @__PURE__ */ jsxs("span", {
															className: "text-[11px] sm:text-xs font-bold bg-rose-100 text-rose-700 px-2 py-1 rounded flex items-center gap-1",
															children: [/* @__PURE__ */ jsx("svg", {
																className: "w-3.5 h-3.5",
																fill: "none",
																stroke: "currentColor",
																viewBox: "0 0 24 24",
																children: /* @__PURE__ */ jsx("path", {
																	strokeLinecap: "round",
																	strokeLinejoin: "round",
																	strokeWidth: "2",
																	d: "M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
																})
															}), " HOOK (ฮุก)"]
														}), /* @__PURE__ */ jsxs("span", {
															className: "text-[10px] sm:text-xs text-slate-400 flex items-center gap-1",
															children: [/* @__PURE__ */ jsx("svg", {
																className: "w-3.5 h-3.5",
																fill: "none",
																stroke: "currentColor",
																viewBox: "0 0 24 24",
																children: /* @__PURE__ */ jsx("path", {
																	strokeLinecap: "round",
																	strokeLinejoin: "round",
																	strokeWidth: "2",
																	d: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
																})
															}), " 0:00 - 0:03"]
														})]
													}),
													/* @__PURE__ */ jsx("p", {
														className: "text-slate-800 font-bold text-sm mb-3 leading-relaxed",
														children: "\"หยุดก่อน! ใครเป็นสิวอักเสบ สิวซ้ำซาก หายแล้วก็ขึ้นใหม่ที่เดิม... ถ้าไม่อยากหน้าพังไปกว่านี้ ดูคลิปนี้ให้จบด่วน!\""
													}),
													/* @__PURE__ */ jsxs("div", {
														className: "bg-white p-2.5 rounded-lg text-xs text-slate-500 border border-slate-200 flex gap-2 items-start",
														children: [/* @__PURE__ */ jsx("span", {
															className: "mt-0.5 text-blue-500",
															children: /* @__PURE__ */ jsx("svg", {
																className: "w-4 h-4",
																fill: "none",
																stroke: "currentColor",
																viewBox: "0 0 24 24",
																children: /* @__PURE__ */ jsx("path", {
																	strokeLinecap: "round",
																	strokeLinejoin: "round",
																	strokeWidth: "2",
																	d: "M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
																})
															})
														}), /* @__PURE__ */ jsxs("span", {
															className: "leading-tight",
															children: [/* @__PURE__ */ jsx("strong", {
																className: "text-slate-700",
																children: "ภาพ:"
															}), " ทำหน้าเครียด เอามือจับรอยสิวบนหน้า แล้วซูมกล้องเข้าใกล้ๆ"]
														})]
													})
												]
											}),
											/* @__PURE__ */ jsxs("div", {
												className: "bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm",
												children: [
													/* @__PURE__ */ jsxs("div", {
														className: "flex justify-between items-center mb-2",
														children: [/* @__PURE__ */ jsxs("span", {
															className: "text-[11px] sm:text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded flex items-center gap-1",
															children: [/* @__PURE__ */ jsx("svg", {
																className: "w-3.5 h-3.5",
																fill: "none",
																stroke: "currentColor",
																viewBox: "0 0 24 24",
																children: /* @__PURE__ */ jsx("path", {
																	strokeLinecap: "round",
																	strokeLinejoin: "round",
																	strokeWidth: "2",
																	d: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
																})
															}), " REVEAL (เข้าเนื้อหา)"]
														}), /* @__PURE__ */ jsxs("span", {
															className: "text-[10px] sm:text-xs text-slate-400 flex items-center gap-1",
															children: [/* @__PURE__ */ jsx("svg", {
																className: "w-3.5 h-3.5",
																fill: "none",
																stroke: "currentColor",
																viewBox: "0 0 24 24",
																children: /* @__PURE__ */ jsx("path", {
																	strokeLinecap: "round",
																	strokeLinejoin: "round",
																	strokeWidth: "2",
																	d: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
																})
															}), " 0:03 - 0:10"]
														})]
													}),
													/* @__PURE__ */ jsx("p", {
														className: "text-slate-800 font-medium text-sm mb-3 leading-relaxed",
														children: "\"บอกเลยว่าตั้งแต่ลองตัวนี้ ชีวิตเปลี่ยน! สิวเม็ดเป้งยุบกริบใน 3 วัน แถมหน้าไม่ลอก ไม่แสบแดงเลยสักนิด เนื้อสัมผัสใสแจ๋ว ซึมไวแบบทาปุ๊บแต่งหน้าต่อได้เลย\""
													}),
													/* @__PURE__ */ jsxs("div", {
														className: "bg-white p-2.5 rounded-lg text-xs text-slate-500 border border-slate-200 flex gap-2 items-start",
														children: [/* @__PURE__ */ jsx("span", {
															className: "mt-0.5 text-blue-500",
															children: /* @__PURE__ */ jsx("svg", {
																className: "w-4 h-4",
																fill: "none",
																stroke: "currentColor",
																viewBox: "0 0 24 24",
																children: /* @__PURE__ */ jsx("path", {
																	strokeLinecap: "round",
																	strokeLinejoin: "round",
																	strokeWidth: "2",
																	d: "M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
																})
															})
														}), /* @__PURE__ */ jsxs("span", {
															className: "leading-tight",
															children: [/* @__PURE__ */ jsx("strong", {
																className: "text-slate-700",
																children: "ภาพ:"
															}), " บีบสกินแคร์ลงบนหลังมือ ถูเบาๆ ให้ดูความซึมไว (แทรกรูป Before/After ตอนสิวยุบ)"]
														})]
													})
												]
											}),
											/* @__PURE__ */ jsx("div", {
												className: "text-center mt-3",
												children: /* @__PURE__ */ jsxs("p", {
													className: "inline-block text-[11px] sm:text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 leading-relaxed shadow-sm",
													children: [
														"* นี่เป็นเพียงตัวอย่าง 2 ท่อนแรก ",
														/* @__PURE__ */ jsx("br", {}),
														" จากสคริปต์แบบเต็ม 5 ท่อน"
													]
												})
											})
										]
									}),
									/* @__PURE__ */ jsxs("ul", {
										className: "mt-6 space-y-2 text-sm text-blue-800 font-medium",
										children: [
											/* @__PURE__ */ jsxs("li", {
												className: "flex gap-2 items-start",
												children: [
													/* @__PURE__ */ jsx("span", {
														className: "text-blue-500 mt-0.5",
														children: /* @__PURE__ */ jsx("svg", {
															className: "w-4 h-4",
															fill: "none",
															stroke: "currentColor",
															viewBox: "0 0 24 24",
															children: /* @__PURE__ */ jsx("path", {
																strokeLinecap: "round",
																strokeLinejoin: "round",
																strokeWidth: "2",
																d: "M5 13l4 4L19 7"
															})
														})
													}),
													" ",
													/* @__PURE__ */ jsx("span", { children: "โครงสร้างสคริปต์สั้น กระชับ หยุดนิ้วคนดูได้จริง" })
												]
											}),
											/* @__PURE__ */ jsxs("li", {
												className: "flex gap-2 items-start",
												children: [
													/* @__PURE__ */ jsx("span", {
														className: "text-blue-500 mt-0.5",
														children: /* @__PURE__ */ jsx("svg", {
															className: "w-4 h-4",
															fill: "none",
															stroke: "currentColor",
															viewBox: "0 0 24 24",
															children: /* @__PURE__ */ jsx("path", {
																strokeLinecap: "round",
																strokeLinejoin: "round",
																strokeWidth: "2",
																d: "M5 13l4 4L19 7"
															})
														})
													}),
													" ",
													/* @__PURE__ */ jsx("span", { children: "มี Action บอกท่าทางให้ทุกท่อน เล่นตามได้เลย" })
												]
											}),
											/* @__PURE__ */ jsxs("li", {
												className: "flex gap-2 items-start",
												children: [
													/* @__PURE__ */ jsx("span", {
														className: "text-blue-500 mt-0.5",
														children: /* @__PURE__ */ jsx("svg", {
															className: "w-4 h-4",
															fill: "none",
															stroke: "currentColor",
															viewBox: "0 0 24 24",
															children: /* @__PURE__ */ jsx("path", {
																strokeLinecap: "round",
																strokeLinejoin: "round",
																strokeWidth: "2",
																d: "M5 13l4 4L19 7"
															})
														})
													}),
													" ",
													/* @__PURE__ */ jsx("span", { children: "ใช้คำกระตุ้นจิตวิทยา FOMO กระชากยอดขาย" })
												]
											})
										]
									})
								]
							})
						]
					})]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "mt-8 mb-20 w-full max-w-6xl mx-auto px-4 text-left",
					children: [/* @__PURE__ */ jsxs("div", {
						className: "text-center mb-10",
						children: [/* @__PURE__ */ jsxs("h2", {
							className: "text-2xl sm:text-4xl font-extrabold text-slate-900 mb-4 tracking-tight leading-snug",
							children: [
								"เบื้องหลังสมองกล ",
								/* @__PURE__ */ jsx("br", {}),
								/* @__PURE__ */ jsx("span", {
									className: "text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600",
									children: "Auto Script"
								})
							]
						}), /* @__PURE__ */ jsxs("p", {
							className: "text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed px-2",
							children: [
								"เราไม่ได้ใช้แค่พรอมต์ธรรมดา แต่เราฝัง ",
								/* @__PURE__ */ jsx("br", { className: "hidden sm:block" }),
								/* @__PURE__ */ jsx("strong", {
									className: "text-slate-800",
									children: "\"6 สูตรจิตวิทยาการขายระดับโลก\""
								}),
								" ",
								/* @__PURE__ */ jsx("br", {}),
								"ที่ Top Creator บน TikTok และ Shopee ใช้จริง ",
								/* @__PURE__ */ jsx("br", { className: "hidden sm:block" }),
								"เพื่อให้คลิปของคุณปิดการขายได้ง่ายที่สุด"
							]
						})]
					}), /* @__PURE__ */ jsxs("div", {
						className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6",
						children: [
							/* @__PURE__ */ jsxs("div", {
								className: "bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow",
								children: [
									/* @__PURE__ */ jsx("div", {
										className: "w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center text-rose-600 mb-4",
										children: /* @__PURE__ */ jsx("svg", {
											className: "w-6 h-6",
											fill: "none",
											stroke: "currentColor",
											viewBox: "0 0 24 24",
											children: /* @__PURE__ */ jsx("path", {
												strokeLinecap: "round",
												strokeLinejoin: "round",
												strokeWidth: "2",
												d: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
											})
										})
									}),
									/* @__PURE__ */ jsx("h3", {
										className: "text-lg font-bold text-slate-900 mb-2",
										children: "PAS Formula"
									}),
									/* @__PURE__ */ jsx("p", {
										className: "text-sm text-slate-600",
										children: "ขยี้ปัญหา (Problem) ให้รู้สึกอิน กระตุ้นความกลัว (Agitate) แล้วค่อยเสนอสินค้าคุณเป็นทางออก (Solution)"
									})
								]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow",
								children: [
									/* @__PURE__ */ jsx("div", {
										className: "w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 mb-4",
										children: /* @__PURE__ */ jsx("svg", {
											className: "w-6 h-6",
											fill: "none",
											stroke: "currentColor",
											viewBox: "0 0 24 24",
											children: /* @__PURE__ */ jsx("path", {
												strokeLinecap: "round",
												strokeLinejoin: "round",
												strokeWidth: "2",
												d: "M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
											})
										})
									}),
									/* @__PURE__ */ jsx("h3", {
										className: "text-lg font-bold text-slate-900 mb-2",
										children: "Hook-Story-Offer"
									}),
									/* @__PURE__ */ jsx("p", {
										className: "text-sm text-slate-600",
										children: "หยุดนิ้วด้วยฮุกแรงๆ (Hook) เล่าเรื่องราวที่เกี่ยวโยง (Story) และยื่นข้อเสนอที่ปฏิเสธไม่ได้ (Offer)"
									})
								]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow",
								children: [
									/* @__PURE__ */ jsx("div", {
										className: "w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 mb-4",
										children: /* @__PURE__ */ jsx("svg", {
											className: "w-6 h-6",
											fill: "none",
											stroke: "currentColor",
											viewBox: "0 0 24 24",
											children: /* @__PURE__ */ jsx("path", {
												strokeLinecap: "round",
												strokeLinejoin: "round",
												strokeWidth: "2",
												d: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
											})
										})
									}),
									/* @__PURE__ */ jsx("h3", {
										className: "text-lg font-bold text-slate-900 mb-2",
										children: "Before-After-Bridge"
									}),
									/* @__PURE__ */ jsx("p", {
										className: "text-sm text-slate-600",
										children: "ฉายภาพความเจ็บปวดในอดีต (Before) ภาพฝันที่สวยงาม (After) และสินค้าคุณคือสะพานเชื่อม (Bridge)"
									})
								]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow",
								children: [
									/* @__PURE__ */ jsx("div", {
										className: "w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600 mb-4",
										children: /* @__PURE__ */ jsx("svg", {
											className: "w-6 h-6",
											fill: "none",
											stroke: "currentColor",
											viewBox: "0 0 24 24",
											children: /* @__PURE__ */ jsx("path", {
												strokeLinecap: "round",
												strokeLinejoin: "round",
												strokeWidth: "2",
												d: "M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
											})
										})
									}),
									/* @__PURE__ */ jsx("h3", {
										className: "text-lg font-bold text-slate-900 mb-2",
										children: "FAB Model"
									}),
									/* @__PURE__ */ jsx("p", {
										className: "text-sm text-slate-600",
										children: "ดึงฟีเจอร์เด่น (Features) เทียบข้อได้เปรียบเหนือคู่แข่ง (Advantages) และประโยชน์แท้จริงที่ลูกค้าได้ (Benefits)"
									})
								]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "bg-white p-6 rounded-2xl border border-purple-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden",
								children: [
									/* @__PURE__ */ jsx("div", {
										className: "absolute top-0 right-0 bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg",
										children: "PRO"
									}),
									/* @__PURE__ */ jsx("div", {
										className: "w-12 h-12 bg-fuchsia-100 rounded-xl flex items-center justify-center text-fuchsia-600 mb-4",
										children: /* @__PURE__ */ jsx("svg", {
											className: "w-6 h-6",
											fill: "none",
											stroke: "currentColor",
											viewBox: "0 0 24 24",
											children: /* @__PURE__ */ jsx("path", {
												strokeLinecap: "round",
												strokeLinejoin: "round",
												strokeWidth: "2",
												d: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
											})
										})
									}),
									/* @__PURE__ */ jsx("h3", {
										className: "text-lg font-bold text-slate-900 mb-2",
										children: "Belief Shifting"
									}),
									/* @__PURE__ */ jsx("p", {
										className: "text-sm text-slate-600",
										children: "วิเคราะห์ความเชื่อผิดๆ ของลูกค้า (False Belief) และหักล้างด้วยจุดแข็งของสินค้าอย่างมีชั้นเชิง (Epiphany Bridge)"
									})
								]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "lg:col-span-1 md:col-span-2 bg-slate-900 p-6 rounded-2xl flex flex-col justify-center relative overflow-hidden",
								children: [/* @__PURE__ */ jsx("div", {
									className: "absolute -right-10 -bottom-10 opacity-10",
									children: /* @__PURE__ */ jsx("svg", {
										className: "w-48 h-48 text-white",
										fill: "currentColor",
										viewBox: "0 0 24 24",
										children: /* @__PURE__ */ jsx("path", { d: "M12 2L2 22h20L12 2zm0 3.8l7.2 14.4H4.8L12 5.8z" })
									})
								}), /* @__PURE__ */ jsxs("div", {
									className: "relative z-10",
									children: [/* @__PURE__ */ jsx("div", {
										className: "flex items-center gap-2 mb-4",
										children: /* @__PURE__ */ jsx("span", {
											className: "bg-amber-400 text-slate-900 text-xs font-bold px-3 py-1.5 rounded-md shadow-sm",
											children: "อ้างอิงข้อมูล (References)"
										})
									}), /* @__PURE__ */ jsxs("div", {
										className: "text-sm sm:text-base text-slate-300 leading-relaxed space-y-2",
										children: [/* @__PURE__ */ jsx("p", { children: "โมเดลจิตวิทยาทั้งหมดถูกเทรนจากข้อมูลอ้างอิงชั้นนำ อาทิ:" }), /* @__PURE__ */ jsxs("ul", {
											className: "pl-2 space-y-2",
											children: [
												/* @__PURE__ */ jsxs("li", {
													className: "flex items-start gap-2",
													children: [/* @__PURE__ */ jsx("span", {
														className: "text-amber-500 mt-1",
														children: "•"
													}), /* @__PURE__ */ jsxs("span", { children: ["งานวิจัย E-commerce Psychology จาก ", /* @__PURE__ */ jsx("strong", {
														className: "text-white",
														children: "Nielsen Norman Group"
													})] })]
												}),
												/* @__PURE__ */ jsxs("li", {
													className: "flex items-start gap-2",
													children: [/* @__PURE__ */ jsx("span", {
														className: "text-amber-500 mt-1",
														children: "•"
													}), /* @__PURE__ */ jsxs("span", { children: ["โครงสร้างคลิปไวรัลของ ", /* @__PURE__ */ jsx("strong", {
														className: "text-white",
														children: "TikTok For Business"
													})] })]
												}),
												/* @__PURE__ */ jsxs("li", {
													className: "flex items-start gap-2",
													children: [/* @__PURE__ */ jsx("span", {
														className: "text-amber-500 mt-1",
														children: "•"
													}), /* @__PURE__ */ jsxs("span", { children: ["บทวิเคราะห์พฤติกรรมนักช้อปไทยบน ", /* @__PURE__ */ jsx("strong", {
														className: "text-white",
														children: "Shopee / Lazada"
													})] })]
												})
											]
										})]
									})]
								})]
							})
						]
					})]
				})
			]
		})
	] });
}
var _index_default = UNSAFE_withComponentProps(Home);
//#endregion
//#region app/routes/legal.jsx
var legal_exports = /* @__PURE__ */ __exportAll({ default: () => legal_default });
function Legal() {
	const navigate = useNavigate();
	const handleBack = (e) => {
		e.preventDefault();
		if (window.history.state && window.history.state.idx > 0) navigate(-1);
		else navigate("/");
	};
	return /* @__PURE__ */ jsxs(Fragment, { children: [
		/* @__PURE__ */ jsx("title", { children: "นโยบายและข้อตกลงการใช้งาน | Auto Script" }),
		/* @__PURE__ */ jsx("meta", {
			name: "description",
			content: "นโยบายความเป็นส่วนตัว (Privacy Policy) และเงื่อนไขการให้บริการ (Terms of Service) ของ Auto Script"
		}),
		/* @__PURE__ */ jsxs("div", {
			className: "max-w-4xl mx-auto px-4 py-12",
			children: [/* @__PURE__ */ jsx("div", {
				className: "mb-6",
				children: /* @__PURE__ */ jsxs("a", {
					href: "#",
					onClick: handleBack,
					className: "text-blue-600 hover:underline flex items-center gap-1 text-sm font-medium",
					children: [/* @__PURE__ */ jsx("svg", {
						className: "w-4 h-4",
						fill: "none",
						stroke: "currentColor",
						viewBox: "0 0 24 24",
						children: /* @__PURE__ */ jsx("path", {
							strokeLinecap: "round",
							strokeLinejoin: "round",
							strokeWidth: "2",
							d: "M10 19l-7-7m0 0l7-7m-7 7h18"
						})
					}), "ย้อนกลับ"]
				})
			}), /* @__PURE__ */ jsxs("div", {
				className: "bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-slate-700 leading-relaxed space-y-8",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "text-center border-b border-slate-100 pb-8",
						children: [/* @__PURE__ */ jsx("h1", {
							className: "text-3xl font-extrabold text-slate-900 mb-2",
							children: "นโยบายและข้อตกลงการใช้งาน"
						}), /* @__PURE__ */ jsx("p", {
							className: "text-slate-500",
							children: "ปรับปรุงล่าสุด: สิงหาคม 2569"
						})]
					}),
					/* @__PURE__ */ jsxs("section", {
						className: "space-y-4",
						children: [
							/* @__PURE__ */ jsx("h2", {
								className: "text-xl font-bold text-slate-900 border-l-4 border-blue-600 pl-3",
								children: "1. เงื่อนไขการให้บริการ (Terms of Service)"
							}),
							/* @__PURE__ */ jsx("p", { children: "เว็บไซต์ Auto Script ให้บริการระบบปัญญาประดิษฐ์ (AI) ในการสร้างสรรค์สคริปต์วิดีโอ โดยเมื่อท่านสมัครสมาชิกและชำระเงิน ถือว่าท่านได้ยอมรับข้อตกลงดังต่อไปนี้:" }),
							/* @__PURE__ */ jsxs("ul", {
								className: "list-disc pl-6 space-y-2",
								children: [
									/* @__PURE__ */ jsx("li", { children: "เครดิตการใช้งานไม่สามารถแลกเปลี่ยนหรือทอนเป็นเงินสดได้" }),
									/* @__PURE__ */ jsx("li", { children: "ห้ามนำระบบไปใช้สร้างเนื้อหาที่ผิดกฎหมาย ละเมิดลิขสิทธิ์ หรือสร้างความเกลียดชัง" }),
									/* @__PURE__ */ jsx("li", { children: "ผู้ให้บริการขอสงวนสิทธิ์ในการระงับบัญชี หากพบการใช้งานที่ผิดวัตถุประสงค์ (เช่น ใช้บอทโจมตีระบบ)" })
								]
							})
						]
					}),
					/* @__PURE__ */ jsxs("section", {
						className: "space-y-4",
						children: [
							/* @__PURE__ */ jsx("h2", {
								className: "text-xl font-bold text-slate-900 border-l-4 border-rose-500 pl-3",
								children: "2. นโยบายการคืนเงิน (Refund Policy)"
							}),
							/* @__PURE__ */ jsxs("p", { children: [
								"เนื่องจากบริการของเราเป็นสินค้าดิจิทัลและเปิดให้ใช้งานทันที (Digital Goods)",
								/* @__PURE__ */ jsx("strong", { children: " ทางเราขอสงวนสิทธิ์ \"ไม่รับคืนเงินทุกกรณี (No Refund)\" " }),
								"หลังจากที่ระบบได้ทำการเติมเครดิตเข้าบัญชีของท่านเรียบร้อยแล้ว"
							] }),
							/* @__PURE__ */ jsx("p", { children: "*หากท่านพบปัญหาเครดิตไม่เข้า หรือระบบขัดข้อง สามารถติดต่อฝ่ายสนับสนุนเพื่อขอรับเครดิตชดเชยได้" })
						]
					}),
					/* @__PURE__ */ jsxs("section", {
						className: "space-y-4",
						children: [
							/* @__PURE__ */ jsx("h2", {
								className: "text-xl font-bold text-slate-900 border-l-4 border-emerald-500 pl-3",
								children: "3. นโยบายความเป็นส่วนตัว (PDPA / Privacy Policy)"
							}),
							/* @__PURE__ */ jsx("p", { children: "เราให้ความสำคัญกับข้อมูลส่วนบุคคลของท่าน และปฏิบัติตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA) อย่างเคร่งครัด:" }),
							/* @__PURE__ */ jsxs("ul", {
								className: "list-disc pl-6 space-y-2",
								children: [
									/* @__PURE__ */ jsxs("li", { children: [/* @__PURE__ */ jsx("strong", { children: "ข้อมูลที่จัดเก็บ:" }), " อีเมล, รหัสผ่าน (เข้ารหัสความปลอดภัย), ข้อมูลการสั่งซื้อ (เชื่อมโยงผ่าน Stripe) และประวัติการสร้างสคริปต์"] }),
									/* @__PURE__ */ jsxs("li", { children: [/* @__PURE__ */ jsx("strong", { children: "วัตถุประสงค์:" }), " เพื่อใช้ในการยืนยันตัวตน เติมเครดิต และปรับปรุงคุณภาพ AI เท่านั้น"] }),
									/* @__PURE__ */ jsxs("li", { children: [/* @__PURE__ */ jsx("strong", { children: "การเปิดเผยข้อมูล:" }), " เราไม่มีนโยบายขายหรือแชร์ข้อมูลของท่านให้บุคคลที่สามเด็ดขาด (ยกเว้นระบบชำระเงินที่ต้องทำงานร่วมกับ Stripe)"] }),
									/* @__PURE__ */ jsxs("li", { children: [/* @__PURE__ */ jsx("strong", { children: "การลบบัญชี:" }), " ท่านสามารถกดปุ่ม \"ลบบัญชีและข้อมูลทั้งหมด\" ได้ด้วยตนเองที่หน้าตั้งค่า ข้อมูลจะถูกลบออกจากฐานข้อมูลอย่างถาวร"] })
								]
							})
						]
					}),
					/* @__PURE__ */ jsxs("section", {
						className: "mt-8 pt-8 border-t border-slate-100 text-sm text-slate-500 flex flex-col items-start gap-4",
						children: [/* @__PURE__ */ jsx("p", { children: "หากมีข้อสงสัยเพิ่มเติม หรือพบปัญหาการใช้งาน สามารถติดต่อทีมงานฝ่ายสนับสนุนได้ตลอดเวลาผ่านทาง LINE Official Account" }), /* @__PURE__ */ jsxs("a", {
							href: "https://lin.ee/x0yVB1kk",
							target: "_blank",
							rel: "noopener noreferrer",
							className: "inline-flex items-center gap-2 bg-[#00B900] text-white px-5 py-2.5 rounded-lg font-bold hover:bg-[#009900] transition-colors shadow-sm",
							children: [/* @__PURE__ */ jsx("svg", {
								className: "w-5 h-5",
								fill: "currentColor",
								viewBox: "0 0 24 24",
								children: /* @__PURE__ */ jsx("path", { d: "M24 10.304c0-5.369-5.383-9.738-12-9.738-6.616 0-12 4.369-12 9.738 0 4.814 3.53 8.877 8.358 9.613.332.072.782.22.894.509.1.258.064.654.03 1.001-.002.012-.039.245-.049.299-.057.348-.27.876 1.002.341 1.274-.536 6.877-4.043 9.426-6.953 2.658-3.033 4.339-6.075 4.339-9.81z" })
							}), "ติดต่อฝ่ายสนับสนุน (LINE)"]
						})]
					})
				]
			})]
		})
	] });
}
var legal_default = UNSAFE_withComponentProps(Legal);
//#endregion
//#region app/routes/login.jsx
var login_exports = /* @__PURE__ */ __exportAll({ default: () => login_default });
function Login() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const errorRef = useRef(null);
	const navigate = useNavigate();
	useEffect(() => {
		if (error && errorRef.current) {
			const y = errorRef.current.getBoundingClientRect().top + window.scrollY - 100;
			window.scrollTo({
				top: y,
				behavior: "smooth"
			});
		}
	}, [error]);
	const handleLogin = async (e) => {
		e.preventDefault();
		setLoading(true);
		setError(null);
		if (password.length < 8) {
			setError("รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร");
			setLoading(false);
			return;
		}
		if (/[\u0E00-\u0E7F]/.test(password)) {
			setError("รหัสผ่านต้องเป็นภาษาอังกฤษ ห้ามมีภาษาไทย");
			setLoading(false);
			return;
		}
		const { error } = await supabase.auth.signInWithPassword({
			email,
			password
		});
		if (error) {
			setError(translateError(error.message));
			setLoading(false);
		} else navigate("/create");
	};
	const handleGoogleLogin = async () => {
		const { error } = await supabase.auth.signInWithOAuth({
			provider: "google",
			options: { redirectTo: `${window.location.origin}/create` }
		});
		if (error) setError(translateError(error.message));
	};
	return /* @__PURE__ */ jsxs(Fragment, { children: [
		/* @__PURE__ */ jsx("title", { children: "เข้าสู่ระบบ | Auto Script" }),
		/* @__PURE__ */ jsx("meta", {
			name: "description",
			content: "เข้าสู่ระบบ Auto Script เพื่อใช้งาน AI เขียนสคริปต์วิดีโอ"
		}),
		/* @__PURE__ */ jsxs("div", {
			className: "max-w-md mx-auto mt-12 bg-white p-8 rounded-xl shadow-sm border border-slate-200",
			children: [
				/* @__PURE__ */ jsx("h2", {
					className: "text-2xl font-bold text-center text-slate-900 mb-6",
					children: "เข้าสู่ระบบ"
				}),
				error && /* @__PURE__ */ jsx("div", {
					ref: errorRef,
					className: "bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4",
					children: error
				}),
				/* @__PURE__ */ jsxs("button", {
					onClick: handleGoogleLogin,
					className: "w-full flex items-center justify-center gap-3 bg-white border border-slate-300 text-slate-700 px-4 py-2.5 rounded-lg font-medium hover:bg-slate-50 transition-colors mb-6 shadow-sm",
					children: [/* @__PURE__ */ jsxs("svg", {
						className: "w-5 h-5",
						viewBox: "0 0 24 24",
						children: [
							/* @__PURE__ */ jsx("path", {
								d: "M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z",
								fill: "#4285F4"
							}),
							/* @__PURE__ */ jsx("path", {
								d: "M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z",
								fill: "#34A853"
							}),
							/* @__PURE__ */ jsx("path", {
								d: "M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z",
								fill: "#FBBC05"
							}),
							/* @__PURE__ */ jsx("path", {
								d: "M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z",
								fill: "#EA4335"
							})
						]
					}), "เข้าสู่ระบบด้วย Google"]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "relative flex items-center py-2 mb-4",
					children: [
						/* @__PURE__ */ jsx("div", { className: "flex-grow border-t border-slate-200" }),
						/* @__PURE__ */ jsx("span", {
							className: "flex-shrink-0 mx-4 text-slate-400 text-sm",
							children: "หรือใช้อีเมล"
						}),
						/* @__PURE__ */ jsx("div", { className: "flex-grow border-t border-slate-200" })
					]
				}),
				/* @__PURE__ */ jsxs("form", {
					onSubmit: handleLogin,
					className: "space-y-4",
					children: [
						/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
							className: "block text-sm font-medium text-slate-700 mb-1",
							children: "อีเมล"
						}), /* @__PURE__ */ jsx("input", {
							type: "email",
							required: true,
							value: email,
							onChange: (e) => setEmail(e.target.value),
							className: "w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none",
							placeholder: "your@email.com"
						})] }),
						/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsxs("div", {
							className: "flex justify-between items-center mb-1",
							children: [/* @__PURE__ */ jsx("label", {
								className: "block text-sm font-medium text-slate-700",
								children: "รหัสผ่าน"
							}), /* @__PURE__ */ jsx(Link, {
								to: "/forgot-password",
								className: "text-sm text-blue-600 hover:underline",
								children: "ลืมรหัสผ่าน?"
							})]
						}), /* @__PURE__ */ jsxs("div", {
							className: "relative",
							children: [/* @__PURE__ */ jsx("input", {
								type: showPassword ? "text" : "password",
								required: true,
								minLength: "8",
								value: password,
								onChange: (e) => {
									const val = e.target.value;
									if (!/[\u0E00-\u0E7F]/.test(val)) setPassword(val);
								},
								className: "w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none pr-12",
								placeholder: "••••••••"
							}), /* @__PURE__ */ jsx("button", {
								type: "button",
								onClick: () => setShowPassword(!showPassword),
								className: "absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none",
								children: showPassword ? /* @__PURE__ */ jsx("svg", {
									xmlns: "http://www.w3.org/2000/svg",
									fill: "none",
									viewBox: "0 0 24 24",
									strokeWidth: 1.5,
									stroke: "currentColor",
									className: "w-5 h-5",
									children: /* @__PURE__ */ jsx("path", {
										strokeLinecap: "round",
										strokeLinejoin: "round",
										d: "M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
									})
								}) : /* @__PURE__ */ jsxs("svg", {
									xmlns: "http://www.w3.org/2000/svg",
									fill: "none",
									viewBox: "0 0 24 24",
									strokeWidth: 1.5,
									stroke: "currentColor",
									className: "w-5 h-5",
									children: [/* @__PURE__ */ jsx("path", {
										strokeLinecap: "round",
										strokeLinejoin: "round",
										d: "M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
									}), /* @__PURE__ */ jsx("path", {
										strokeLinecap: "round",
										strokeLinejoin: "round",
										d: "M15 12a3 3 0 11-6 0 3 3 0 016 0z"
									})]
								})
							})]
						})] }),
						/* @__PURE__ */ jsx("button", {
							type: "submit",
							disabled: loading,
							className: `w-full py-2 rounded-lg text-white font-medium transition-colors ${loading ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`,
							children: loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"
						})
					]
				}),
				/* @__PURE__ */ jsxs("p", {
					className: "mt-6 text-center text-sm text-slate-600",
					children: [
						"ยังไม่มีบัญชีใช่ไหม?",
						" ",
						/* @__PURE__ */ jsx(Link, {
							to: "/register",
							className: "text-blue-600 hover:underline font-medium",
							children: "สมัครสมาชิกฟรี"
						})
					]
				})
			]
		})
	] });
}
var login_default = UNSAFE_withComponentProps(Login);
//#endregion
//#region \0virtual:react-router/server-manifest
var server_manifest_default = {
	"entry": {
		"module": "/assets/entry.client-CIrKwtw8.js",
		"imports": ["/assets/jsx-runtime-CU6ZeWfl.js", "/assets/react-dom-DMgvKEUl.js"],
		"css": []
	},
	"routes": {
		"root": {
			"id": "root",
			"parentId": void 0,
			"path": "",
			"index": void 0,
			"caseSensitive": void 0,
			"hasAction": false,
			"hasLoader": false,
			"hasClientAction": false,
			"hasClientLoader": false,
			"hasClientMiddleware": false,
			"hasDefaultExport": true,
			"hasErrorBoundary": false,
			"module": "/assets/root-MZIIFYVr.js",
			"imports": [
				"/assets/jsx-runtime-CU6ZeWfl.js",
				"/assets/react-dom-DMgvKEUl.js",
				"/assets/supabase-BlHG2laC.js",
				"/assets/AuthContext-B7plj0MP.js"
			],
			"css": ["/assets/root-DkjU5nQA.css"],
			"clientActionModule": void 0,
			"clientLoaderModule": void 0,
			"clientMiddlewareModule": void 0,
			"hydrateFallbackModule": void 0
		},
		"routes/forgot-password": {
			"id": "routes/forgot-password",
			"parentId": "root",
			"path": "forgot-password",
			"index": void 0,
			"caseSensitive": void 0,
			"hasAction": false,
			"hasLoader": false,
			"hasClientAction": false,
			"hasClientLoader": false,
			"hasClientMiddleware": false,
			"hasDefaultExport": true,
			"hasErrorBoundary": false,
			"module": "/assets/forgot-password-B11STTWu.js",
			"imports": [
				"/assets/jsx-runtime-CU6ZeWfl.js",
				"/assets/supabase-BlHG2laC.js",
				"/assets/translateError-Y1of7JNa.js"
			],
			"css": [],
			"clientActionModule": void 0,
			"clientLoaderModule": void 0,
			"clientMiddlewareModule": void 0,
			"hydrateFallbackModule": void 0
		},
		"routes/reset-password": {
			"id": "routes/reset-password",
			"parentId": "root",
			"path": "reset-password",
			"index": void 0,
			"caseSensitive": void 0,
			"hasAction": false,
			"hasLoader": false,
			"hasClientAction": false,
			"hasClientLoader": false,
			"hasClientMiddleware": false,
			"hasDefaultExport": true,
			"hasErrorBoundary": false,
			"module": "/assets/reset-password-CFfZQlc1.js",
			"imports": [
				"/assets/jsx-runtime-CU6ZeWfl.js",
				"/assets/supabase-BlHG2laC.js",
				"/assets/translateError-Y1of7JNa.js"
			],
			"css": [],
			"clientActionModule": void 0,
			"clientLoaderModule": void 0,
			"clientMiddlewareModule": void 0,
			"hydrateFallbackModule": void 0
		},
		"routes/register": {
			"id": "routes/register",
			"parentId": "root",
			"path": "register",
			"index": void 0,
			"caseSensitive": void 0,
			"hasAction": false,
			"hasLoader": false,
			"hasClientAction": false,
			"hasClientLoader": false,
			"hasClientMiddleware": false,
			"hasDefaultExport": true,
			"hasErrorBoundary": false,
			"module": "/assets/register-r88T9_OZ.js",
			"imports": [
				"/assets/jsx-runtime-CU6ZeWfl.js",
				"/assets/supabase-BlHG2laC.js",
				"/assets/translateError-Y1of7JNa.js"
			],
			"css": [],
			"clientActionModule": void 0,
			"clientLoaderModule": void 0,
			"clientMiddlewareModule": void 0,
			"hydrateFallbackModule": void 0
		},
		"routes/settings": {
			"id": "routes/settings",
			"parentId": "root",
			"path": "settings",
			"index": void 0,
			"caseSensitive": void 0,
			"hasAction": false,
			"hasLoader": false,
			"hasClientAction": false,
			"hasClientLoader": false,
			"hasClientMiddleware": false,
			"hasDefaultExport": true,
			"hasErrorBoundary": false,
			"module": "/assets/settings-Dr22xrO8.js",
			"imports": [
				"/assets/jsx-runtime-CU6ZeWfl.js",
				"/assets/supabase-BlHG2laC.js",
				"/assets/AuthContext-B7plj0MP.js"
			],
			"css": [],
			"clientActionModule": void 0,
			"clientLoaderModule": void 0,
			"clientMiddlewareModule": void 0,
			"hydrateFallbackModule": void 0
		},
		"routes/history": {
			"id": "routes/history",
			"parentId": "root",
			"path": "history",
			"index": void 0,
			"caseSensitive": void 0,
			"hasAction": false,
			"hasLoader": false,
			"hasClientAction": false,
			"hasClientLoader": false,
			"hasClientMiddleware": false,
			"hasDefaultExport": true,
			"hasErrorBoundary": false,
			"module": "/assets/history-e7AWLLmb.js",
			"imports": [
				"/assets/jsx-runtime-CU6ZeWfl.js",
				"/assets/supabase-BlHG2laC.js",
				"/assets/AuthContext-B7plj0MP.js"
			],
			"css": [],
			"clientActionModule": void 0,
			"clientLoaderModule": void 0,
			"clientMiddlewareModule": void 0,
			"hydrateFallbackModule": void 0
		},
		"routes/pricing": {
			"id": "routes/pricing",
			"parentId": "root",
			"path": "pricing",
			"index": void 0,
			"caseSensitive": void 0,
			"hasAction": false,
			"hasLoader": false,
			"hasClientAction": false,
			"hasClientLoader": false,
			"hasClientMiddleware": false,
			"hasDefaultExport": true,
			"hasErrorBoundary": false,
			"module": "/assets/pricing-dhhfGfiG.js",
			"imports": [
				"/assets/jsx-runtime-CU6ZeWfl.js",
				"/assets/AuthContext-B7plj0MP.js",
				"/assets/supabase-BlHG2laC.js"
			],
			"css": [],
			"clientActionModule": void 0,
			"clientLoaderModule": void 0,
			"clientMiddlewareModule": void 0,
			"hydrateFallbackModule": void 0
		},
		"routes/create": {
			"id": "routes/create",
			"parentId": "root",
			"path": "create",
			"index": void 0,
			"caseSensitive": void 0,
			"hasAction": false,
			"hasLoader": false,
			"hasClientAction": false,
			"hasClientLoader": false,
			"hasClientMiddleware": false,
			"hasDefaultExport": true,
			"hasErrorBoundary": false,
			"module": "/assets/create-BJrGfgZI.js",
			"imports": [
				"/assets/jsx-runtime-CU6ZeWfl.js",
				"/assets/supabase-BlHG2laC.js",
				"/assets/AuthContext-B7plj0MP.js"
			],
			"css": [],
			"clientActionModule": void 0,
			"clientLoaderModule": void 0,
			"clientMiddlewareModule": void 0,
			"hydrateFallbackModule": void 0
		},
		"routes/_index": {
			"id": "routes/_index",
			"parentId": "root",
			"path": void 0,
			"index": true,
			"caseSensitive": void 0,
			"hasAction": false,
			"hasLoader": false,
			"hasClientAction": false,
			"hasClientLoader": false,
			"hasClientMiddleware": false,
			"hasDefaultExport": true,
			"hasErrorBoundary": false,
			"module": "/assets/_index-C4LCj0JY.js",
			"imports": ["/assets/jsx-runtime-CU6ZeWfl.js"],
			"css": [],
			"clientActionModule": void 0,
			"clientLoaderModule": void 0,
			"clientMiddlewareModule": void 0,
			"hydrateFallbackModule": void 0
		},
		"routes/legal": {
			"id": "routes/legal",
			"parentId": "root",
			"path": "legal",
			"index": void 0,
			"caseSensitive": void 0,
			"hasAction": false,
			"hasLoader": false,
			"hasClientAction": false,
			"hasClientLoader": false,
			"hasClientMiddleware": false,
			"hasDefaultExport": true,
			"hasErrorBoundary": false,
			"module": "/assets/legal-DPNDMANg.js",
			"imports": ["/assets/jsx-runtime-CU6ZeWfl.js"],
			"css": [],
			"clientActionModule": void 0,
			"clientLoaderModule": void 0,
			"clientMiddlewareModule": void 0,
			"hydrateFallbackModule": void 0
		},
		"routes/login": {
			"id": "routes/login",
			"parentId": "root",
			"path": "login",
			"index": void 0,
			"caseSensitive": void 0,
			"hasAction": false,
			"hasLoader": false,
			"hasClientAction": false,
			"hasClientLoader": false,
			"hasClientMiddleware": false,
			"hasDefaultExport": true,
			"hasErrorBoundary": false,
			"module": "/assets/login-CTGgxvmi.js",
			"imports": [
				"/assets/jsx-runtime-CU6ZeWfl.js",
				"/assets/supabase-BlHG2laC.js",
				"/assets/translateError-Y1of7JNa.js"
			],
			"css": [],
			"clientActionModule": void 0,
			"clientLoaderModule": void 0,
			"clientMiddlewareModule": void 0,
			"hydrateFallbackModule": void 0
		}
	},
	"url": "/assets/manifest-98422600.js",
	"version": "98422600",
	"sri": void 0
};
//#endregion
//#region \0virtual:react-router/server-build
var assetsBuildDirectory = "build\\client";
var basename = "/";
var future = {
	"unstable_optimizeDeps": false,
	"v8_passThroughRequests": false,
	"v8_trailingSlashAwareDataRequests": false,
	"unstable_previewServerPrerendering": false,
	"v8_middleware": false,
	"v8_splitRouteModules": false,
	"v8_viteEnvironmentApi": false
};
var ssr = true;
var isSpaMode = false;
var prerender = [
	"/",
	"/pricing",
	"/login",
	"/register",
	"/legal",
	"/forgot-password",
	"/reset-password"
];
var routeDiscovery = {
	"mode": "lazy",
	"manifestPath": "/__manifest"
};
var publicPath = "/";
var entry = { module: entry_server_exports };
var routes = {
	"root": {
		id: "root",
		parentId: void 0,
		path: "",
		index: void 0,
		caseSensitive: void 0,
		module: root_exports
	},
	"routes/forgot-password": {
		id: "routes/forgot-password",
		parentId: "root",
		path: "forgot-password",
		index: void 0,
		caseSensitive: void 0,
		module: forgot_password_exports
	},
	"routes/reset-password": {
		id: "routes/reset-password",
		parentId: "root",
		path: "reset-password",
		index: void 0,
		caseSensitive: void 0,
		module: reset_password_exports
	},
	"routes/register": {
		id: "routes/register",
		parentId: "root",
		path: "register",
		index: void 0,
		caseSensitive: void 0,
		module: register_exports
	},
	"routes/settings": {
		id: "routes/settings",
		parentId: "root",
		path: "settings",
		index: void 0,
		caseSensitive: void 0,
		module: settings_exports
	},
	"routes/history": {
		id: "routes/history",
		parentId: "root",
		path: "history",
		index: void 0,
		caseSensitive: void 0,
		module: history_exports
	},
	"routes/pricing": {
		id: "routes/pricing",
		parentId: "root",
		path: "pricing",
		index: void 0,
		caseSensitive: void 0,
		module: pricing_exports
	},
	"routes/create": {
		id: "routes/create",
		parentId: "root",
		path: "create",
		index: void 0,
		caseSensitive: void 0,
		module: create_exports
	},
	"routes/_index": {
		id: "routes/_index",
		parentId: "root",
		path: void 0,
		index: true,
		caseSensitive: void 0,
		module: _index_exports
	},
	"routes/legal": {
		id: "routes/legal",
		parentId: "root",
		path: "legal",
		index: void 0,
		caseSensitive: void 0,
		module: legal_exports
	},
	"routes/login": {
		id: "routes/login",
		parentId: "root",
		path: "login",
		index: void 0,
		caseSensitive: void 0,
		module: login_exports
	}
};
var allowedActionOrigins = false;
//#endregion
export { allowedActionOrigins, server_manifest_default as assets, assetsBuildDirectory, basename, entry, future, isSpaMode, prerender, publicPath, routeDiscovery, routes, ssr };
