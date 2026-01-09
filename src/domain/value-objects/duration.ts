export class Duration {
	private constructor(public readonly totalMilliseconds: number) {
		Object.freeze(this);
	}

	static fromMilliseconds(ms: number): Duration {
		return new Duration(Math.max(0, Math.round(ms)));
	}

	static fromSeconds(seconds: number): Duration {
		return Duration.fromMilliseconds(seconds * 1000);
	}

	static fromMinutes(minutes: number): Duration {
		return Duration.fromMilliseconds(minutes * 60 * 1000);
	}

	static fromHMS(hours: number, minutes: number, seconds: number): Duration {
		return Duration.fromMilliseconds((hours * 3600 + minutes * 60 + seconds) * 1000);
	}

	static parse(value: string): Duration {
		const parts = value.split(':').map(Number);

		if (parts.some(isNaN)) {
			throw new Error(`Invalid duration format: ${value}`);
		}

		if (parts.length === 2) {
			const [minutes, seconds] = parts;
			return Duration.fromHMS(0, minutes, seconds);
		} else if (parts.length === 3) {
			const [hours, minutes, seconds] = parts;
			return Duration.fromHMS(hours, minutes, seconds);
		}

		throw new Error(`Invalid duration format: ${value}. Expected MM:SS or HH:MM:SS.`);
	}

	static tryParse(value: string): Duration | null {
		try {
			return Duration.parse(value);
		} catch {
			return null;
		}
	}

	static readonly ZERO = new Duration(0);

	get totalSeconds(): number {
		return Math.floor(this.totalMilliseconds / 1000);
	}

	get totalMinutes(): number {
		return Math.floor(this.totalMilliseconds / 60000);
	}

	get totalHours(): number {
		return Math.floor(this.totalMilliseconds / 3600000);
	}

	get hours(): number {
		return Math.floor(this.totalMilliseconds / 3600000);
	}

	get minutes(): number {
		return Math.floor((this.totalMilliseconds % 3600000) / 60000);
	}

	get seconds(): number {
		return Math.floor((this.totalMilliseconds % 60000) / 1000);
	}

	get milliseconds(): number {
		return this.totalMilliseconds % 1000;
	}

	format(): string {
		const h = this.hours;
		const m = this.minutes;
		const s = this.seconds;

		const pad = (n: number) => n.toString().padStart(2, '0');

		if (h > 0) {
			return `${h}:${pad(m)}:${pad(s)}`;
		}
		return `${m}:${pad(s)}`;
	}

	formatLong(): string {
		const h = this.hours;
		const m = this.minutes;
		const s = this.seconds;

		const pad = (n: number) => n.toString().padStart(2, '0');
		return `${pad(h)}:${pad(m)}:${pad(s)}`;
	}

	formatHuman(): string {
		const h = this.hours;
		const m = this.minutes;
		const s = this.seconds;

		const parts: string[] = [];
		if (h > 0) parts.push(`${h} hr`);
		if (m > 0) parts.push(`${m} min`);
		if (s > 0 || parts.length === 0) parts.push(`${s} sec`);

		return parts.join(' ');
	}

	add(other: Duration): Duration {
		return Duration.fromMilliseconds(this.totalMilliseconds + other.totalMilliseconds);
	}

	subtract(other: Duration): Duration {
		return Duration.fromMilliseconds(this.totalMilliseconds - other.totalMilliseconds);
	}

	multiply(factor: number): Duration {
		return Duration.fromMilliseconds(this.totalMilliseconds * factor);
	}

	equals(other: Duration): boolean {
		return this.totalMilliseconds === other.totalMilliseconds;
	}

	greaterThan(other: Duration): boolean {
		return this.totalMilliseconds > other.totalMilliseconds;
	}

	lessThan(other: Duration): boolean {
		return this.totalMilliseconds < other.totalMilliseconds;
	}

	isZero(): boolean {
		return this.totalMilliseconds === 0;
	}

	toString(): string {
		return this.format();
	}

	toJSON(): number {
		return this.totalMilliseconds;
	}
}
