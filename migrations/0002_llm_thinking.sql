-- 0002_llm_thinking.sql
-- LLM profile 的思考模式配置（DeepSeek 等支持 thinking 的模型）
-- thinking: default（不显式传） / enabled / disabled
-- reasoning_effort: low / high / max

ALTER TABLE llm_profiles ADD COLUMN thinking TEXT;
ALTER TABLE llm_profiles ADD COLUMN reasoning_effort TEXT;
