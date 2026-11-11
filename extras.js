/*
 * COMPLÉMENTS DU GUIDE : schémas de topologie et exemples de sortie.
 *
 * X.topo : un schéma par fiche (clé = id de la fiche dans data.js), affiché en haut de la fiche.
 * X.out  : un exemple de sortie par commande (clé = la commande, écrite exactement comme dans
 *          les champs verify de data.js). Il apparaît sous chaque bloc de vérification qui
 *          contient cette commande.
 *            out  : la sortie telle qu'elle apparaît sur l'équipement
 *            read : ce qu'il faut y regarder
 */
const X = {
  topo: {
    vlan: `        SW1
   +-----------+
   | Gi0/1  Gi0/2  Gi0/3  Gi0/4 |
   +---|------|------|------|---+
      PC1    PC2    PC3    PC4
    VLAN 10 VLAN 10 VLAN 20 VLAN 20

  PC1 <-> PC2 : même VLAN, ils communiquent
  PC1 <-> PC3 : VLAN différents, il faut un routeur`,
    trunk: `   VLAN 10   VLAN 20            VLAN 10   VLAN 20
     PC1       PC2                PC3       PC4
      |         |                  |         |
   +--+---------+--+   trunk    +--+---------+--+
   |      SW1      |============|      SW2      |
   +---------------+ Gi0/24     +---------------+
                     802.1Q : VLAN 10, 20
                     VLAN natif 99 (non étiqueté)`,
    intervlan: `  Router-on-a-stick                 Switch de niveau 3 (SVI)

        R1                                 SW1
   Gi0/0.10  .1  VLAN 10          interface vlan 10  .1
   Gi0/0.20  .1  VLAN 20          interface vlan 20  .1
        |                           + ip routing
        | trunk 802.1Q                  |       |
       SW1                           VLAN 10  VLAN 20
      /    \\                           PC1     PC2
  VLAN 10  VLAN 20
    PC1      PC2`,
    stp: `              SW1 (root bridge)
             /                 \\
        DP  /                   \\  DP
           /                     \\
       RP /                       \\ RP
        SW2 --------------------- SW3
            DP                 ALT (bloqué)

  RP  : root port, le meilleur chemin vers le root
  DP  : designated port, transmet sur le segment
  ALT : port bloqué, qui coupe la boucle`,
    etherchannel: `              Port-channel 1 (Po1)
   +-------+   Gi0/1 ======== Gi0/1   +-------+
   |  SW1  |   Gi0/2 ======== Gi0/2   |  SW2  |
   +-------+                          +-------+
   LACP active                     LACP active ou passive

  STP voit un seul lien logique : aucun port bloqué,
  et le débit des liens s'additionne.`,
    dhcp: `   PC (client)          R1 (relais)             Serveur DHCP
       |                Gi0/1    Gi0/0              10.0.0.5
       |--- Discover --->|                              |
       |   (broadcast)   |--- unicast (helper) -------->|
       |                 |<-------- Offer --------------|
       |<---- Offer -----|                              |

  ip helper-address se place sur Gi0/1, côté clients.
  Sans relais, le broadcast s'arrête au routeur.`,
    nat: `     LAN privé                R1                   Internet
  192.168.1.0/24      Gi0/0        Gi0/1
   PC .10 ---------- [inside]    [outside] ---------- 8.8.8.8
                    192.168.1.1  203.0.113.2

  Aller  : source 192.168.1.10:51000 -> 203.0.113.2:51000
  Retour : R1 retrouve le PC grâce à sa table de traduction`,
    acl: `   192.168.1.0/24          R1                 10.0.0.0/24
     PC ------------ Gi0/0     Gi0/1 ------------ Serveur
                      [in]     [out]

  ACL étendue  : au plus près de la source (Gi0/0 in),
                 elle filtre sur source, destination et port.
  ACL standard : au plus près de la destination (Gi0/1 out),
                 elle ne filtre que sur la source.`,
    static: `   LAN A               R1                R2               LAN B
 192.168.1.0/24 --- Gi0/0  Gi0/1 ---- Gi0/1  Gi0/0 --- 192.168.2.0/24
                          10.0.0.1  10.0.0.2

  R1 : ip route 192.168.2.0 255.255.255.0 10.0.0.2
  R2 : ip route 192.168.1.0 255.255.255.0 10.0.0.1
  Il faut une route dans chaque sens, sinon la réponse se perd.`,
    ospf: `                    Aire 0 (backbone)
   LAN --- R1 ------------------ R2 ------------------ R3 --- LAN
        Gi0/1  Gi0/0       Gi0/0    Gi0/1        Gi0/0   Gi0/1
       passive   10.0.12.0/30         10.0.23.0/30      passive

  Les voisinages se forment sur les liens entre routeurs.
  Les interfaces vers les LAN sont passives : annoncées, sans hello.`,
    hsrp: `        R1 (actif)                     R2 (standby)
     prio 110, preempt                  prio 100
       192.168.10.2                   192.168.10.3
            |                              |
   ---------+---------- VLAN 10 -----------+---------
                          |
                         PC    passerelle = 192.168.10.254
                               (adresse virtuelle partagée)`,
    eigrp: `                    AS 100
            R1 ------------ R2
              \\             |
               \\            |
                \\           |
                 R3 --------+

  Vers un réseau derrière R2, R1 retient :
   - le successeur : le meilleur chemin (direct)
   - un feasible successor : le chemin de secours par R3,
     déjà calculé et utilisable sans délai`,
    bgp: `        AS 65001                        AS 65002
   +----------------+              +----------------+
   |  R2 --iBGP-- R1 |----eBGP-----| ISP            |
   | 2.2.2.2  1.1.1.1 | 203.0.113.0/30 | 203.0.113.1 |
   +----------------+              +----------------+

  eBGP : entre deux AS, sur le lien direct.
  iBGP : dans le même AS, entre loopbacks (update-source),
         avec next-hop-self sur le routeur de bordure.`,
    dhcpsnoop: `                 Serveur DHCP légitime
                         |
                  Gi0/24 | trusted
                 +-------+-------+
                 |      SW1      |
                 +--+----------+-+
          untrusted |          | untrusted
                   PC       Faux serveur DHCP
                            (ses offres sont jetées)`,
    gre: `     LAN A                                              LAN B
  192.168.1.0/24                                     192.168.2.0/24
       |                                                   |
       R1 ============== tunnel0 (GRE) ==================== R2
    10.0.0.1/30                                       10.0.0.2/30
       |                                                   |
   203.0.113.1 -------------- Internet -------------- 198.51.100.2

  Source et destination du tunnel : les adresses publiques.
  Adresse du tunnel : le réseau interne 10.0.0.0/30.`,
    qos: `   Trafic entrant        Classer       Décider            Sortie
                        (class-map)  (policy-map)

   voix   (EF)   ------> VOIX  -----> priority 20 % ---+
   vidéo  (AF41) ------> VIDEO -----> bandwidth 30 % --+--> Gi0/1
   reste         ------> class-default -> fair-queue --+   (service-policy
                                                            output)`,
    multicast: `   Source                    RP                    Récepteur
  10.1.1.10               10.0.0.1                abonné à 239.1.1.1
     |                        |                         |
     R1 -------- PIM -------- R2 -------- PIM --------- R3
                                                    (IGMP join)

  1. Le récepteur s'abonne au groupe : R3 remonte un join vers le RP.
  2. La source émet : R1 l'enregistre auprès du RP.
  3. Le flux descend l'arbre jusqu'au récepteur.`,
    wireless: `   Client Wi-Fi          Borne (AP)                 WLC 9800
        )))  -------------   |   ===== CAPWAP =====   |
      SSID                   |   UDP 5246 (contrôle)  |
                             |   UDP 5247 (données)   |---- trunk ---- LAN
                                                       VLAN des clients

  WLAN (SSID, sécurité) + profil de politique (VLAN)
  = tag de politique, attribué aux bornes`,
    sdwan: `      vManage          vSmart           vBond
    (administration)  (contrôle, OMP)  (mise en relation)
           \\              |              /
            \\             |             /
             +--- connexions de contrôle (DTLS) ---+
             |                                     |
          Edge1 ======= tunnels IPsec + BFD ======= Edge2
          site 100          (données)             site 200`,
    ipsla: `                       +--- ISP 1 (principal) --- 8.8.8.8
                       |    203.0.113.1            ^
   LAN --- R1 ---------+                           | sonde ICMP
                       |                           | (ip sla 1)
                       +--- ISP 2 (secours)
                            198.51.100.1

  La sonde échoue -> track 1 passe down -> la route par défaut
  vers ISP 1 est retirée -> la route de secours prend le relais.`,
    span: `   PC ------ Gi0/1 +-----------+ Gi0/24 ------ réseau
                   |    SW1    |
                   +-----+-----+
                         | Gi0/10 : copie du trafic de Gi0/1
                     Analyseur
                    (Wireshark)`,
  },
  out: {
    "show ip interface brief": {
      out: `Interface              IP-Address      OK? Method Status                Protocol
GigabitEthernet0/0     192.168.1.1     YES manual up                    up
GigabitEthernet0/1     10.0.0.1        YES manual up                    down
GigabitEthernet0/2     unassigned      YES unset  administratively down down
Loopback0              1.1.1.1         YES manual up                    up`,
      read: "Status est la couche physique, Protocol la couche liaison. up/up : tout va bien. up/down : problème de couche 2 en face. administratively down : il manque no shutdown.",
    },
    "show interfaces status": {
      out: `Port      Name        Status       Vlan       Duplex  Speed Type
Gi0/1     PC-Compta   connected    20         a-full  a-1000 10/100/1000BaseTX
Gi0/2                 notconnect   1            auto   auto 10/100/1000BaseTX
Gi0/3                 err-disabled 10           auto   auto 10/100/1000BaseTX
Gi0/24    Vers-SW2    connected    trunk      a-full  a-1000 10/100/1000BaseTX`,
      read: "connected : lien actif. notconnect : rien de branché. err-disabled : port coupé par une protection (port security, BPDU Guard…). La colonne Vlan indique trunk pour un trunk.",
    },
    "show vlan brief": {
      out: `VLAN Name                             Status    Ports
---- -------------------------------- --------- -------------------------------
1    default                          active    Gi0/5, Gi0/6, Gi0/7, Gi0/8
10   USERS                            active    Gi0/1, Gi0/2
20   COMPTA                           active    Gi0/3, Gi0/4
1002 fddi-default                     act/unsup`,
      read: "Chaque port d'accès apparaît en face de son VLAN. Un port absent de la liste est soit un trunk, soit affecté à un VLAN qui n'existe pas.",
    },
    "show interfaces trunk": {
      out: `Port        Mode         Encapsulation  Status        Native vlan
Gi0/24      on           802.1q         trunking      99

Port        Vlans allowed on trunk
Gi0/24      10,20,99

Port        Vlans allowed and active in management domain
Gi0/24      10,20,99

Port        Vlans in spanning tree forwarding state and not pruned
Gi0/24      10,20,99`,
      read: "Vérifie le VLAN natif (identique des deux côtés) et la liste des VLAN autorisés. Un VLAN autorisé mais absent de la dernière liste est bloqué par STP ou n'existe pas.",
    },
    "show spanning-tree root": {
      out: `                                        Root    Hello Max Fwd
Vlan                   Root ID          Cost    Time  Age Dly  Root Port
---------------- -------------------- --------- ----- --- ---  ------------
VLAN0010         24586 0c1a.2b3c.4d00         4    2   20  15  Gi0/24
VLAN0020         24596 0c1a.2b3c.4d00         4    2   20  15  Gi0/24`,
      read: "Root ID donne la priorité et l'adresse MAC du root de chaque VLAN. Une colonne Root Port vide signifie que ce switch est lui-même le root.",
    },
    "show etherchannel summary": {
      out: `Flags:  D - down        P - bundled in port-channel
        I - stand-alone s - suspended
        S - Layer2      U - in use

Group  Port-channel  Protocol    Ports
------+-------------+-----------+-------------------------------
1      Po1(SU)         LACP      Gi0/1(P)    Gi0/2(P)`,
      read: "Po1(SU) : canal de niveau 2 en service. (P) : port intégré au canal. (I) : port isolé, la négociation a échoué. (s) : port suspendu, sa configuration diffère de celle des autres.",
    },
    "show ip route": {
      out: `Codes: L - local, C - connected, S - static, O - OSPF, D - EIGRP, B - BGP
Gateway of last resort is 203.0.113.1 to network 0.0.0.0

S*    0.0.0.0/0 [1/0] via 203.0.113.1
      10.0.0.0/8 is variably subnetted, 2 subnets, 2 masks
C        10.0.12.0/30 is directly connected, GigabitEthernet0/0
L        10.0.12.1/32 is directly connected, GigabitEthernet0/0
O     192.168.2.0/24 [110/2] via 10.0.12.2, 00:12:41, GigabitEthernet0/0`,
      read: "La lettre indique l'origine de la route. Entre crochets : [distance administrative/métrique]. Gateway of last resort est la route par défaut.",
    },
    "show ip route ospf": {
      out: `      10.0.0.0/8 is variably subnetted, 3 subnets, 2 masks
O        10.0.23.0/30 [110/2] via 10.0.12.2, 00:08:15, GigabitEthernet0/0
O     192.168.2.0/24 [110/2] via 10.0.12.2, 00:08:15, GigabitEthernet0/0
O IA  192.168.3.0/24 [110/3] via 10.0.12.2, 00:08:15, GigabitEthernet0/0
O*E2  0.0.0.0/0 [110/1] via 10.0.12.2, 00:05:02, GigabitEthernet0/0`,
      read: "O : route de la même aire. O IA : route d'une autre aire. O E2 : route externe, redistribuée ou route par défaut annoncée par default-information originate.",
    },
    "show ip ospf neighbor": {
      out: `Neighbor ID     Pri   State           Dead Time   Address         Interface
2.2.2.2           1   FULL/DR         00:00:37    10.0.12.2       GigabitEthernet0/0
3.3.3.3           1   FULL/BDR        00:00:33    10.0.13.2       GigabitEthernet0/1`,
      read: "L'état doit être FULL (ou 2WAY entre deux routeurs qui ne sont ni DR ni BDR). Un voisin bloqué en INIT, EXSTART ou EXCHANGE signale un problème : hello à sens unique, MTU différente.",
    },
    "show ip ospf interface brief": {
      out: `Interface    PID   Area            IP Address/Mask    Cost  State Nbrs F/C
Lo0          1     0               1.1.1.1/32         1     LOOP  0/0
Gi0/0        1     0               10.0.12.1/30       1     BDR   1/1
Gi0/1        1     0               192.168.1.1/24     1     DR    0/0`,
      read: "Toutes les interfaces OSPF et leur aire. Nbrs F/C : voisins en état FULL / voisins détectés. 0/0 est normal sur une interface passive.",
    },
    "show standby brief": {
      out: `                     P indicates configured to preempt.
                     |
Interface   Grp  Pri P State   Active          Standby         Virtual IP
Gi0/0       10   110 P Active  local           192.168.10.3    192.168.10.254`,
      read: "State doit valoir Active sur un routeur et Standby sur l'autre. Deux routeurs Active : ils ne se voient pas. Le P indique que preempt est configuré.",
    },
    "show ip nat translations": {
      out: `Pro Inside global      Inside local       Outside local      Outside global
tcp 203.0.113.2:51000  192.168.1.10:51000 8.8.8.8:443        8.8.8.8:443
tcp 203.0.113.2:51001  192.168.1.11:51001 1.1.1.1:443        1.1.1.1:443
--- 203.0.113.10       192.168.1.20       ---                ---`,
      read: "Inside local : l'adresse privée. Inside global : l'adresse publique vue d'Internet. La dernière ligne, sans port, est un NAT statique. Table vide : vérifie inside/outside et l'ACL.",
    },
    "show ip dhcp binding": {
      out: `IP address       Client-ID/              Lease expiration        Type
                 Hardware address
192.168.10.11    0100.5056.a1b2.c3       Mar 02 2025 09:14 AM    Automatic
192.168.10.12    0100.5056.d4e5.f6       Mar 02 2025 10:02 AM    Automatic`,
      read: "Une ligne par adresse distribuée, avec le client et la fin du bail. Liste vide alors que des clients sont branchés : les requêtes n'arrivent pas (relais, VLAN, pool).",
    },
    "show ip eigrp neighbors": {
      out: `EIGRP-IPv4 Neighbors for AS(100)
H   Address         Interface       Hold Uptime   SRTT   RTO  Q  Seq
                                    (sec)         (ms)       Cnt Num
0   10.0.12.2       Gi0/0             13 00:21:07   12   200  0  45
1   10.0.13.2       Gi0/1             11 00:20:58   15   200  0  38`,
      read: "Chaque voisin doit apparaître avec un Uptime qui augmente. Q Cnt doit rester à 0 : une valeur qui ne redescend pas indique des paquets en attente.",
    },
    "show ip bgp summary": {
      out: `BGP router identifier 1.1.1.1, local AS number 65001
Neighbor        V    AS MsgRcvd MsgSent   TblVer  InQ OutQ Up/Down  State/PfxRcd
2.2.2.2         4 65001     142     140       12    0    0 02:05:11        3
203.0.113.1     4 65002      57      61       12    0    0 00:48:30       15
198.51.100.1    4 65003       0       0        1    0    0 never    Active`,
      read: "Un nombre dans la dernière colonne : session établie, c'est le nombre de préfixes reçus. Un mot (Idle, Active) : la session n'est pas montée.",
    },
    "show ip bgp": {
      out: `     Network          Next Hop            Metric LocPrf Weight Path
 *>  8.8.8.0/24       203.0.113.1              0             0 65002 15169 i
 * i                  2.2.2.2                  0    100      0 65003 15169 i
 *>  198.51.100.0/24  0.0.0.0                  0         32768 i`,
      read: "* : route valide. > : meilleure route, la seule installée. i en début de ligne : apprise en iBGP. Next Hop 0.0.0.0 : préfixe annoncé par ce routeur.",
    },
    "show port-security interface <INTERFACE>": {
      out: `Port Security              : Enabled
Port Status                : Secure-up
Violation Mode             : Restrict
Maximum MAC Addresses      : 2
Total MAC Addresses        : 1
Sticky MAC Addresses       : 1
Last Source Address:Vlan   : 0050.56a1.b2c3:10
Security Violation Count   : 0`,
      read: "Port Status : Secure-up en fonctionnement normal, Secure-shutdown après une violation en mode shutdown. Le compteur de violations augmente en mode restrict.",
    },
    "show ip access-lists <ACL_NAME>": {
      out: `Extended IP access list FILTRE_LAN
    10 deny tcp 192.168.1.0 0.0.0.255 host 10.0.0.10 eq telnet (12 matches)
    20 permit ip any any (4821 matches)`,
      read: "Les lignes sont évaluées dans l'ordre des numéros. Le compteur de matches montre quelles lignes servent réellement : une ligne à zéro n'est jamais atteinte ou jamais concernée.",
    },
    "show ip ssh": {
      out: `SSH Enabled - version 2.0
Authentication methods:publickey,keyboard-interactive,password
Authentication timeout: 60 secs; Authentication retries: 3
Minimum expected Diffie Hellman key size : 2048 bits`,
      read: "La version doit être 2.0. La version 1.99 signifie que SSHv1 est encore accepté : ajoute ip ssh version 2.",
    },
    "show crypto isakmp sa": {
      out: `IPv4 Crypto ISAKMP SA
dst             src             state          conn-id status
198.51.100.2    203.0.113.1     QM_IDLE           1001 ACTIVE`,
      read: "QM_IDLE et ACTIVE : la phase 1 est montée. MM_NO_STATE : la politique IKE ne correspond pas ou l'autre côté ne répond pas. MM_KEY_EXCH : clé partagée différente.",
    },
    "show policy-map interface <INTERFACE>": {
      out: ` GigabitEthernet0/1
  Service-policy output: WAN
    Class-map: VOIX (match-any)
      1520 packets, 304000 bytes
      Match: dscp ef (46)
      Priority: 20% (2000 kbps), burst bytes 50000
      (total drops) 0
    Class-map: class-default (match-any)
      48211 packets, 51234880 bytes
      (total drops) 137`,
      read: "Chaque classe affiche ce qu'elle a vu passer et ce qu'elle a jeté. Des compteurs à zéro dans une classe signifient que le trafic n'y correspond pas.",
    },
    "show ip mroute <GROUP_ADDRESS>": {
      out: `(*, 239.1.1.1), 00:04:12/00:02:47, RP 10.0.0.1, flags: S
  Incoming interface: GigabitEthernet0/0, RPF nbr 10.0.23.2
  Outgoing interface list:
    GigabitEthernet0/1, Forward/Sparse, 00:04:12/00:02:47

(10.1.1.10, 239.1.1.1), 00:01:05/00:02:31, flags: T
  Incoming interface: GigabitEthernet0/0, RPF nbr 10.0.23.2
  Outgoing interface list:
    GigabitEthernet0/1, Forward/Sparse, 00:01:05/00:02:47`,
      read: "(*, G) : l'arbre partagé, par le RP. (S, G) : l'arbre de la source. Incoming interface doit être l'interface vers la source ou le RP. Une liste de sortie vide (Null) : aucun récepteur en aval.",
    },
    "show sdwan control connections": {
      out: `PEER    PEER PEER            SITE  PEER                    PEER
TYPE    PROT SYSTEM IP       ID    PUBLIC IP               STATE  UPTIME
-----------------------------------------------------------------------
vsmart  dtls 10.255.0.3      1     198.51.100.13           up     0:02:14:55
vmanage dtls 10.255.0.1      1     198.51.100.11           up     0:02:14:57`,
      read: "Il faut une connexion up vers vSmart et vManage. La connexion vers vBond est temporaire : elle disparaît une fois les autres établies. Liste vide : regarde show sdwan control connection-history.",
    },
    "show ip sla statistics": {
      out: `IPSLA operation id: 1
        Latest RTT: 12 milliseconds
Latest operation start time: 09:14:27 UTC Mon Mar 3 2025
Latest operation return code: OK
Number of successes: 842
Number of failures: 3
Operation time to live: Forever`,
      read: "Le code de retour doit être OK. Timeout : la cible ne répond pas. Si les compteurs ne bougent pas, la sonde n'a pas été planifiée.",
    },
    "show track": {
      out: `Track 1
  IP SLA 1 reachability
  Reachability is Up
    4 changes, last change 00:31:08
  Latest operation return code: OK
  Tracked by:
    Static IP Routing 0`,
      read: "Reachability is Up : la sonde réussit. Tracked by montre ce qui dépend de l'objet (route statique, HSRP). Un grand nombre de changements signale un lien instable.",
    },
    "show monitor session all": {
      out: `Session 1
---------
Type                   : Local Session
Source Ports           :
    Both               : Gi0/1
Destination Ports      : Gi0/10
    Encapsulation      : Native`,
      read: "La source et la destination doivent apparaître dans la même session. Both : les deux sens sont copiés.",
    },
    "show wlan summary": {
      out: `Number of WLANs: 1

ID   Profile Name          SSID                  Status  Security
----------------------------------------------------------------------
1    WLAN_CORP             Corp-WiFi             UP      [WPA2][PSK][AES]`,
      read: "Status doit être UP : un WLAN est créé désactivé. La colonne Security confirme le mode d'authentification réellement appliqué.",
    },
  },
};
