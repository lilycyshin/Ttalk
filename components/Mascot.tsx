// 캐릭터 + 말풍선(선택). src는 내향 정도별 캐릭터 그림 (lib/persona의 INTROVERT_LEVELS[].image).
export default function Mascot({ say, size = 120, src }: { say?: string; size?: number; src: string }) {
  return (
    <div className="mascot-wrap">
      {say && <div className="bubble">{say}</div>}
      <div className="mascot-stage" style={{ width: size + 36, height: size + 36 }}>
        <img className="mascot-img" src={src} alt="내향인 생존하기 캐릭터" style={{ height: size }} />
      </div>
    </div>
  );
}
