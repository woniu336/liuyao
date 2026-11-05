'use client';

import React from 'react';

/**
 * 山水页景（轻 SVG，不依赖图片资源）
 * ================================
 * 只做浅墨的空间氛围，不抢交互；移动端宽度变窄时两侧自然裁边。
 */
export default function InkLandscape() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1440 440"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-x-0 top-0 h-[235px] w-full sm:h-[260px] lg:h-[285px]"
    >
      <defs>
        <linearGradient id="mistWash" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#AFC2C7" stopOpacity="0.20" />
          <stop offset="1" stopColor="#AFC2C7" stopOpacity="0.02" />
        </linearGradient>
        <linearGradient id="mountainWash" x1="0" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor="#81989B" stopOpacity="0.10" />
          <stop offset="1" stopColor="#687C80" stopOpacity="0.22" />
        </linearGradient>
      </defs>

      {/* 山雾铺底 */}
      <path d="M0 260 C180 205 260 300 420 258 C570 218 650 292 790 264 C970 220 1090 270 1230 220 C1320 190 1380 205 1440 175 L1440 440 L0 440Z" fill="url(#mistWash)" />

      {/* 左上：老枝与疏叶 */}
      <g fill="none" stroke="#657875" strokeLinecap="round" strokeLinejoin="round" opacity="0.30">
        <path d="M-30 105 C70 90 104 126 176 112 C230 100 252 60 324 50" strokeWidth="3" />
        <path d="M48 98 C72 63 90 38 111 13 M88 111 C116 77 139 65 160 47 M160 113 C187 87 215 82 244 69 M237 79 C264 53 286 38 316 34" strokeWidth="1.8" />
        <path d="M72 67 C59 51 45 47 31 48 M91 47 C79 31 69 25 56 24 M113 78 C99 62 87 57 73 58 M138 64 C132 45 122 35 108 31 M184 91 C175 70 164 63 149 60 M213 83 C207 65 197 55 185 50 M264 53 C252 39 241 34 228 33 M288 40 C285 26 280 16 270 8" strokeWidth="1.3" />
      </g>
      <g fill="#657875" opacity="0.22">
        <ellipse cx="34" cy="48" rx="10" ry="4" transform="rotate(28 34 48)" />
        <ellipse cx="57" cy="24" rx="10" ry="4" transform="rotate(35 57 24)" />
        <ellipse cx="75" cy="58" rx="10" ry="4" transform="rotate(22 75 58)" />
        <ellipse cx="109" cy="31" rx="11" ry="4" transform="rotate(40 109 31)" />
        <ellipse cx="151" cy="60" rx="11" ry="4" transform="rotate(18 151 60)" />
        <ellipse cx="187" cy="50" rx="10" ry="4" transform="rotate(24 187 50)" />
        <ellipse cx="230" cy="33" rx="10" ry="4" transform="rotate(30 230 33)" />
        <ellipse cx="271" cy="8" rx="10" ry="4" transform="rotate(55 271 8)" />
      </g>

      {/* 右侧：远山 */}
      <g fill="none" stroke="#627A7F" strokeLinecap="round" strokeLinejoin="round" opacity="0.25">
        <path d="M770 282 C860 242 888 178 948 137 C1003 100 1035 145 1074 170 C1120 115 1151 50 1213 37 C1271 24 1308 112 1340 142 C1375 125 1400 94 1460 83" strokeWidth="2" />
        <path d="M794 291 C877 257 910 205 954 173 C1000 141 1029 174 1065 197 M1082 185 C1125 141 1164 80 1214 68 C1260 58 1294 139 1332 170 M1260 230 C1322 193 1368 167 1442 158" strokeWidth="1.2" />
        <path d="M914 229 C938 214 951 209 970 206 M1172 112 C1197 97 1218 95 1237 99 M1338 187 C1374 172 1405 172 1429 177" strokeWidth="1" />
      </g>
      <path d="M770 282 C860 242 888 178 948 137 C1003 100 1035 145 1074 170 C1120 115 1151 50 1213 37 C1271 24 1308 112 1340 142 C1375 125 1400 94 1460 83 L1460 310 C1320 320 1190 294 1050 310 C930 323 850 314 770 330Z" fill="url(#mountainWash)" />

      {/* 山巅小亭：细线，不做写实插画抢视觉 */}
      <g fill="none" stroke="#596D70" strokeLinecap="round" strokeLinejoin="round" opacity="0.32" strokeWidth="1.5">
        <path d="M1280 130 L1354 130 M1288 130 L1296 114 L1315 103 L1333 114 L1345 130 M1296 114 L1320 114 L1340 114 M1300 130 L1300 158 M1338 130 L1338 158 M1297 158 L1341 158 M1308 114 L1308 158 M1327 114 L1327 158" />
        <path d="M1285 111 L1320 92 L1350 111 M1291 109 L1320 97 L1345 109 M1305 101 L1305 94 M1320 93 L1320 86 M1334 101 L1334 94" />
      </g>

      {/* 飞鸟 */}
      <g fill="none" stroke="#53676B" strokeLinecap="round" opacity="0.28" strokeWidth="1.4">
        <path d="M1058 82 q8 -7 15 0 q7 -7 15 0 M1093 98 q6 -5 12 0 q6 -5 12 0 M1017 105 q5 -4 10 0 q5 -4 10 0" />
      </g>

      {/* 远岸 / 小舟 */}
      <g fill="none" stroke="#657875" strokeLinecap="round" strokeLinejoin="round" opacity="0.23" strokeWidth="1.3">
        <path d="M72 405 C134 395 205 411 278 401 M90 414 C160 407 213 420 300 411" />
        <path d="M164 392 L214 392 L202 400 L174 400 Z M187 377 L187 392 M188 378 L204 389 L188 389" />
      </g>
    </svg>
  );
}
