// 메인 캐릭터. 말풍선은 선택.
export default function Mascot({ say, size = 120 }: { say?: string; size?: number }) {
  return (
    <div className="mascot-wrap">
      {say && <div className="bubble">{say}</div>}
      <div className="mascot-stage" style={{ width: size + 36, height: size + 36 }}>
        <img className="mascot-img" src="/character.png" alt="내향인 생존하기 캐릭터" style={{ height: size }} />
      </div>
    </div>
  );
}
